"""
run_etl.py — Phase 1 ETL 파이프라인 오케스트레이터

전체 파이프라인을 순서대로 실행:
  1. 데이터 파싱 (parse_unihan + parse_ids)
  2. Pre-ETL 검증
  3. DB 적재 (load_db)
  4. Post-ETL 검증
  5. 결과 리포트

사용법:
    python run_etl.py              # 전체 파이프라인
    python run_etl.py --dry-run    # 파싱 + 검증만 (DB 적재 생략)
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.etl.parse_unihan import parse_unihan, filter_target
from scripts.etl.parse_ids import parse_ids_with_expr
from scripts.etl.validate import validate_pre_etl, validate_post_etl


# 프로젝트 루트의 data/ 폴더 (hanja-app/ 상위)
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def run_pipeline(dry_run: bool = False) -> None:
    start = time.time()
    print("=" * 60)
    print("  Phase 1 ETL 파이프라인")
    print("=" * 60)
    print()

    # ── Step 1: 데이터 파싱 ──────────────────────
    print("[Step 1/5] 데이터 파싱")
    print("-" * 40)
    unihan_path = DATA_DIR / "Unihan.zip"
    ids_path = DATA_DIR / "ids.txt"

    if not unihan_path.exists():
        print(f"  ERROR: {unihan_path} 파일이 없습니다")
        sys.exit(1)
    if not ids_path.exists():
        print(f"  ERROR: {ids_path} 파일이 없습니다")
        sys.exit(1)

    unihan = parse_unihan(unihan_path)
    target = filter_target(unihan)
    ids_map_expr = parse_ids_with_expr(ids_path)
    print(f"  → Unihan 전체: {len(unihan):,}자")
    print(f"  → 학습 대상: {len(target):,}자")
    print(f"  → IDS 분해: {len(ids_map_expr):,}자")
    print()

    # ── Step 2: Pre-ETL 검증 ─────────────────────
    print("[Step 2/5] Pre-ETL 검증")
    print("-" * 40)
    vr_pre, _, _ = validate_pre_etl(unihan_path, ids_path)
    print(vr_pre.report())
    print()

    if not vr_pre.all_passed:
        print("Pre-ETL 검증 실패! 파이프라인을 중단합니다.")
        sys.exit(1)

    if dry_run:
        elapsed = time.time() - start
        print(f"[Dry-run 완료] 파싱 + 검증 성공 ({elapsed:.1f}초)")
        print("  → --dry-run 모드: DB 적재를 건너뜁니다")
        return

    # ── Step 3: DB 적재 ──────────────────────────
    print("[Step 3/5] Supabase DB 적재")
    print("-" * 40)
    from scripts.etl.load_db import (
        get_supabase_client,
        load_characters,
        load_readings,
        load_phonetic_classes,
        load_decompositions,
    )

    supabase = get_supabase_client()
    load_characters(supabase, target, ids_map_expr)
    load_readings(supabase, target)
    load_phonetic_classes(supabase, target)
    load_decompositions(supabase, target, ids_map_expr)
    print()

    # ── Step 4: Post-ETL 검증 ────────────────────
    print("[Step 4/5] Post-ETL 검증")
    print("-" * 40)
    vr_post = validate_post_etl(supabase)
    print(vr_post.report())
    print()

    # ── Step 5: 결과 리포트 ──────────────────────
    elapsed = time.time() - start
    print("[Step 5/5] 결과 리포트")
    print("=" * 60)
    print(f"  소요 시간: {elapsed:.1f}초")
    print(f"  대상 글자: {len(target):,}자")
    print(f"  IDS 분해: {len(ids_map_expr):,}자")
    print(f"  Pre-ETL:  {'PASS' if vr_pre.all_passed else 'FAIL'}")
    print(f"  Post-ETL: {'PASS' if vr_post.all_passed else 'FAIL'}")
    print("=" * 60)

    if not vr_post.all_passed:
        print("\nPost-ETL 검증에 실패한 항목이 있습니다. 확인이 필요합니다.")
        sys.exit(1)

    print("\nPhase 1 ETL 파이프라인 완료!")


def main():
    dry_run = "--dry-run" in sys.argv
    run_pipeline(dry_run=dry_run)


if __name__ == "__main__":
    main()
