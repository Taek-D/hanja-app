"""
validate.py — ETL 데이터 검증 모듈
Phase 1 ETL 파이프라인 컴포넌트

사용법:
    # Pre-ETL 검증 (파싱 결과)
    python validate.py --pre

    # Post-ETL 검증 (DB 적재 결과)
    python validate.py --post
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from scripts.etl.parse_unihan import parse_unihan, filter_target, cp_to_char
from scripts.etl.parse_ids import parse_ids_with_expr


# 기준값
# Phase 0-A 스파이크 기준: IDS 90.6%, kPhonetic 100% (획수 정렬 전)
# 획수 정렬 적용 후 실측: IDS 87.6%, kPhonetic 92.0%
EXPECTED_CHAR_COUNT = 2000
MIN_IDS_COVERAGE = 0.85
MIN_PHONETIC_COVERAGE = 0.90


class ValidationResult:
    def __init__(self) -> None:
        self.checks: list[dict] = []

    def add(self, name: str, passed: bool, detail: str) -> None:
        self.checks.append({"name": name, "passed": passed, "detail": detail})

    @property
    def all_passed(self) -> bool:
        return all(c["passed"] for c in self.checks)

    def report(self) -> str:
        lines = []
        for c in self.checks:
            status = "PASS" if c["passed"] else "FAIL"
            lines.append(f"  [{status}] {c['name']}: {c['detail']}")
        return "\n".join(lines)


def validate_pre_etl(unihan_zip: Path, ids_path: Path) -> ValidationResult:
    """Pre-ETL 검증: 파싱 결과 무결성 확인"""
    result = ValidationResult()

    print("[검증] Pre-ETL 데이터 파싱 중...")
    unihan = parse_unihan(unihan_zip)
    target = filter_target(unihan)
    ids_map_expr = parse_ids_with_expr(ids_path)

    # 1. Unihan 파싱 결과 카운트
    count = len(target)
    result.add(
        "Unihan 대상 글자 수",
        count == EXPECTED_CHAR_COUNT,
        f"{count:,}자 (기대: {EXPECTED_CHAR_COUNT:,}자)",
    )

    # 2. IDS 매핑 커버리지 (≥ 90%)
    ids_matched = sum(1 for cp in target if cp_to_char(cp) in ids_map_expr)
    ids_coverage = ids_matched / count if count > 0 else 0
    result.add(
        "IDS 커버리지",
        ids_coverage >= MIN_IDS_COVERAGE,
        f"{ids_coverage:.1%} ({ids_matched:,}/{count:,}, 최소: {MIN_IDS_COVERAGE:.0%})",
    )

    # 3. kPhonetic 커버리지
    phonetic_count = sum(1 for data in target.values() if data.get("kPhonetic"))
    phonetic_coverage = phonetic_count / count if count > 0 else 0
    result.add(
        "kPhonetic 커버리지",
        phonetic_coverage >= MIN_PHONETIC_COVERAGE,
        f"{phonetic_coverage:.1%} ({phonetic_count:,}/{count:,})",
    )

    # 4. 중복 검사 (같은 글자가 다른 codepoint로 등록되는 경우)
    char_set: dict[str, list[str]] = {}
    for cp_str in target:
        char = cp_to_char(cp_str)
        char_set.setdefault(char, []).append(cp_str)
    duplicates = {ch: cps for ch, cps in char_set.items() if len(cps) > 1}
    result.add(
        "중복 글자 검사",
        len(duplicates) == 0,
        f"중복 {len(duplicates)}건" + (f" — {dict(list(duplicates.items())[:3])}" if duplicates else ""),
    )

    # 5. kHangul 보유 확인 (모든 대상이 kHangul을 가져야 함)
    no_hangul = [cp for cp, data in target.items() if not data.get("kHangul")]
    result.add(
        "kHangul 보유",
        len(no_hangul) == 0,
        f"누락 {len(no_hangul)}건",
    )

    return result, target, ids_map_expr


def _fetch_all(supabase, schema: str, table: str, columns: str) -> list[dict]:
    """Supabase 기본 1,000행 제한을 우회하여 전체 행을 조회"""
    all_rows: list[dict] = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            supabase.schema(schema)
            .table(table)
            .select(columns)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        all_rows.extend(resp.data)
        if len(resp.data) < page_size:
            break
        offset += page_size
    return all_rows


def validate_post_etl(supabase) -> ValidationResult:
    """Post-ETL 검증: DB 적재 결과 확인"""
    result = ValidationResult()
    schema = "hanja"

    # 1. characters 테이블 row count (페이지네이션 적용)
    all_chars = _fetch_all(supabase, schema, "characters", "id,char")
    char_count = len(all_chars)
    result.add(
        "characters 테이블",
        char_count >= EXPECTED_CHAR_COUNT,
        f"{char_count:,}행 (기대: ≥{EXPECTED_CHAR_COUNT:,})",
    )

    # 2. readings 테이블 — 모든 character에 최소 1개 reading
    all_readings = _fetch_all(supabase, schema, "readings", "character_id")
    reading_count = len(all_readings)
    reading_char_ids = {r["character_id"] for r in all_readings}
    all_char_ids = {c["id"] for c in all_chars}
    missing_readings = all_char_ids - reading_char_ids
    result.add(
        "readings 매핑",
        len(missing_readings) == 0,
        f"readings {reading_count:,}행, 누락 {len(missing_readings)}건",
    )

    # 3. decompositions 커버리지
    all_decomps = _fetch_all(supabase, schema, "decompositions", "character_id")
    decomp_count = len(all_decomps)
    decomp_ratio = decomp_count / char_count if char_count > 0 else 0
    result.add(
        "decompositions 커버리지",
        decomp_ratio >= MIN_IDS_COVERAGE,
        f"{decomp_ratio:.1%} ({decomp_count:,}/{char_count:,})",
    )

    # 4. phonetic_classes 테이블
    all_pcs = _fetch_all(supabase, schema, "phonetic_classes", "id")
    pc_count = len(all_pcs)
    result.add(
        "phonetic_classes 테이블",
        pc_count > 0,
        f"{pc_count:,}개 계열",
    )

    return result


def main():
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    mode = sys.argv[1] if len(sys.argv) > 1 else "--pre"

    if mode == "--pre":
        print("=" * 50)
        print("[Pre-ETL 검증]")
        print("=" * 50)
        vr, _, _ = validate_pre_etl(data_dir / "Unihan.zip", data_dir / "ids.txt")
        print(vr.report())
        print()
        status = "ALL PASSED" if vr.all_passed else "SOME FAILED"
        print(f"결과: {status}")
        sys.exit(0 if vr.all_passed else 1)

    elif mode == "--post":
        from dotenv import load_dotenv
        from supabase import create_client

        env_path = Path(__file__).parent.parent.parent / ".env"
        load_dotenv(env_path)

        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        if not url or not key:
            print("SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수가 필요합니다")
            sys.exit(1)

        supabase = create_client(url, key)

        print("=" * 50)
        print("[Post-ETL 검증]")
        print("=" * 50)
        vr = validate_post_etl(supabase)
        print(vr.report())
        print()
        status = "ALL PASSED" if vr.all_passed else "SOME FAILED"
        print(f"결과: {status}")
        sys.exit(0 if vr.all_passed else 1)

    else:
        print(f"사용법: python validate.py [--pre|--post]")
        sys.exit(1)


if __name__ == "__main__":
    main()
