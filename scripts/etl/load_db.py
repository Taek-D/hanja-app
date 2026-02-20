"""
load_db.py — Supabase 데이터 적재 모듈
Phase 1 ETL 파이프라인 컴포넌트

사용법:
    python load_db.py

환경변수 필요:
    SUPABASE_URL=https://xxx.supabase.co
    SUPABASE_SERVICE_KEY=eyJ...
"""

import os
import json
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Supabase Python 클라이언트 (pip install supabase)
try:
    from supabase import create_client, Client
except ImportError:
    print("supabase 패키지가 필요합니다: pip install supabase")
    raise

# ETL 모듈 임포트
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from scripts.etl.parse_unihan import parse_unihan, filter_target, cp_to_char
from scripts.etl.parse_ids import parse_ids_with_expr


# 프로젝트 루트의 data/ 폴더 (hanja-app/ 상위)
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
BATCH_SIZE = 100  # Supabase upsert 배치 크기
PAGE_SIZE = 1000  # Supabase select 페이지네이션 크기
DB_SCHEMA = "hanja"  # 별도 스키마 사용 (기존 public과 격리)


def fetch_all_rows(supabase: "Client", table: str, columns: str) -> list[dict]:
    """Supabase 기본 1,000행 제한을 우회하여 전체 행을 페이지네이션으로 조회"""
    all_rows: list[dict] = []
    offset = 0
    while True:
        resp = (
            supabase.schema(DB_SCHEMA)
            .table(table)
            .select(columns)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        all_rows.extend(resp.data)
        if len(resp.data) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return all_rows


def get_supabase_client() -> "Client":
    # .env 파일에서 환경변수 로드
    # hanja-app/.env
    env_path = Path(__file__).parent.parent.parent / ".env"
    load_dotenv(env_path)

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수를 설정하세요")
    client = create_client(url, key)
    return client


def load_characters(supabase: "Client", target: dict, ids_map: dict):
    """characters 테이블 적재"""
    print("[1/4] characters 테이블 적재 중...")
    rows = []
    for cp_str, data in target.items():
        char = cp_to_char(cp_str)
        # kRSUnicode에서 부수 추출 (예: "85.8" → "85")
        rs = data.get("kRSUnicode", "")
        radical_num = rs.split(".")[0].rstrip("'") if rs else None

        strokes_raw = data.get("kTotalStrokes", "")
        try:
            strokes = int(strokes_raw.split()[0]) if strokes_raw else None
        except Exception:
            strokes = None

        rows.append({
            "char": char,
            "codepoint": int(cp_str[2:], 16),
            "strokes": strokes,
            "radical": radical_num,
            "unihan_def": data.get("kDefinition", "")[:500],
        })

    # 배치 upsert
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        supabase.schema(DB_SCHEMA).table("characters").upsert(batch, on_conflict="char").execute()
        print(f"  → {i + len(batch)}/{len(rows)} 완료")

    print(f"  characters: {len(rows)}개 적재 완료")


def load_readings(supabase: "Client", target: dict):
    """readings 테이블 적재"""
    print("[2/4] readings 테이블 적재 중...")
    # character_id 조회 (페이지네이션 적용)
    all_chars = fetch_all_rows(supabase, "characters", "id,char")
    char_to_id = {row["char"]: row["id"] for row in all_chars}

    rows = []
    for cp_str, data in target.items():
        char = cp_to_char(cp_str)
        char_id = char_to_id.get(char)
        if not char_id:
            continue
        hangul = data.get("kHangul", "")
        if hangul:
            # 여러 음이 있을 경우 분리 (예: "부:0N 불:0E")
            readings_list = hangul.split()
            for idx, reading in enumerate(readings_list):
                value = reading.split(":")[0] if ":" in reading else reading
                rows.append({
                    "character_id": char_id,
                    "type": "kHangul",
                    "value": value,
                    "is_primary": idx == 0,  # 첫 번째 음만 primary
                })

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        supabase.schema(DB_SCHEMA).table("readings").upsert(batch).execute()
        print(f"  → {i + len(batch)}/{len(rows)} 완료")

    print(f"  readings: {len(rows)}개 적재 완료")


def load_phonetic_classes(supabase: "Client", target: dict):
    """phonetic_classes 및 character_phonetic_class 테이블 적재"""
    print("[3/4] phonetic_classes 테이블 적재 중...")
    # 고유 phonetic 코드 수집
    phonetic_codes = set()
    for data in target.values():
        code = data.get("kPhonetic", "")
        if code:
            phonetic_codes.add(code)

    # phonetic_classes upsert
    pc_rows = [{"code": code} for code in phonetic_codes]
    for i in range(0, len(pc_rows), BATCH_SIZE):
        supabase.schema(DB_SCHEMA).table("phonetic_classes").upsert(
            pc_rows[i:i + BATCH_SIZE], on_conflict="code"
        ).execute()

    # ID 조회 (페이지네이션 적용)
    all_pcs = fetch_all_rows(supabase, "phonetic_classes", "id,code")
    code_to_id = {row["code"]: row["id"] for row in all_pcs}

    # character_id 조회 (페이지네이션 적용)
    all_chars = fetch_all_rows(supabase, "characters", "id,char")
    char_to_id = {row["char"]: row["id"] for row in all_chars}

    # character_phonetic_class 적재
    cp_rows = []
    for cp_str, data in target.items():
        char = cp_to_char(cp_str)
        code = data.get("kPhonetic", "")
        if not code:
            continue
        char_id = char_to_id.get(char)
        pc_id = code_to_id.get(code)
        if char_id and pc_id:
            cp_rows.append({"character_id": char_id, "phonetic_class_id": pc_id})

    for i in range(0, len(cp_rows), BATCH_SIZE):
        supabase.schema(DB_SCHEMA).table("character_phonetic_class").upsert(
            cp_rows[i:i + BATCH_SIZE]
        ).execute()

    print(f"  phonetic_classes: {len(pc_rows)}개 적재 완료")


def load_decompositions(supabase: "Client", target: dict, ids_map_expr: dict):
    """decompositions 테이블 적재"""
    print("[4/4] decompositions 테이블 적재 중...")
    all_chars = fetch_all_rows(supabase, "characters", "id,char")
    char_to_id = {row["char"]: row["id"] for row in all_chars}

    rows = []
    for cp_str, data in target.items():
        char = cp_to_char(cp_str)
        char_id = char_to_id.get(char)
        if not char_id:
            continue
        ids_data = ids_map_expr.get(char)
        if ids_data and len(ids_data["components"]) >= 2:
            rows.append({
                "character_id": char_id,
                "ids": ids_data["ids_expr"],
                "components": ids_data["components"],
                "confidence": 90,
            })

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        supabase.schema(DB_SCHEMA).table("decompositions").upsert(
            batch, on_conflict="character_id"
        ).execute()
        print(f"  → {i + len(batch)}/{len(rows)} 완료")

    print(f"  decompositions: {len(rows)}개 적재 완료")


def main():
    print("[Phase 1 ETL] Supabase 데이터 적재 시작\n")

    supabase = get_supabase_client()

    print("[1/2] 데이터 파싱 중...")
    unihan = parse_unihan(DATA_DIR / "Unihan.zip")
    target = filter_target(unihan)
    ids_map_expr = parse_ids_with_expr(DATA_DIR / "ids.txt")
    print(f"  → 대상: {len(target)}자, IDS: {len(ids_map_expr)}개\n")

    print("[2/2] Supabase 적재 중...")
    load_characters(supabase, target, ids_map_expr)
    load_readings(supabase, target)
    load_phonetic_classes(supabase, target)
    load_decompositions(supabase, target, ids_map_expr)

    print("\n[완료] Phase 1 ETL 적재 완료!")


if __name__ == "__main__":
    main()
