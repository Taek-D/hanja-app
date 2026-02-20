"""
meaning_tree_template.py — 의미 트리 입력 템플릿 생성기
Phase 1 큐레이션 도구

사용법:
    python meaning_tree_template.py                 # 300자 자동 선정
    python meaning_tree_template.py 清 語 明        # 지정 글자만

출력:
    hanja-app/data/meaning_tree_input.json — 큐레이터가 채워야 할 템플릿
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from scripts.etl.parse_unihan import parse_unihan, filter_target, cp_to_char
from scripts.etl.parse_ids import parse_ids_with_expr


# 300자 선정 기준
TARGET_300_COUNT = 300
MAX_STROKES = 12  # 획수 1~12획


# 의미 트리 템플릿 구조 예시
TEMPLATE_EXAMPLE = {
    "char": "清",
    "hangul": "청",
    "senses": [
        {
            "id": "s1",
            "label": "맑다 (정화)",
            "short_gloss": "물이 맑고 깨끗한 상태",
            "example": "清水(청수)",
            "parent_id": None,
            "relation": None,
        },
        {
            "id": "s2",
            "label": "깨끗하다 (청결)",
            "short_gloss": "더럽지 않고 깨끗한 상태",
            "example": "清潔(청결)",
            "parent_id": "s1",
            "relation": "extension",
        },
        {
            "id": "s3",
            "label": "맑다 (소리)",
            "short_gloss": "소리가 맑고 청아한",
            "example": "清音(청음)",
            "parent_id": "s1",
            "relation": "metaphor",
        },
    ],
}


def generate_template(char: str, hangul: str = "", definition: str = "") -> dict:
    """글자에 대한 빈 의미 트리 템플릿 생성"""
    return {
        "char": char,
        "hangul": hangul,
        "unihan_def": definition,
        "status": "TODO",  # TODO / IN_PROGRESS / DONE
        "senses": [
            {
                "id": "s1",
                "label": "",  # 큐레이터가 채울 항목
                "short_gloss": "",
                "example": "",
                "parent_id": None,
                "relation": None,
                "_note": "루트 의미 (가장 기본적인 뜻)",
            },
            {
                "id": "s2",
                "label": "",
                "short_gloss": "",
                "example": "",
                "parent_id": "s1",
                "relation": "extension",  # extension / metaphor / specialization
                "_note": "s1에서 확장된 의미",
            },
            {
                "id": "s3",
                "label": "",
                "short_gloss": "",
                "example": "",
                "parent_id": "s1",
                "relation": "metaphor",
                "_note": "s1의 비유적 확장",
            },
        ],
    }


def select_300_chars(target: dict, ids_map_expr: dict) -> list[tuple[str, str, dict]]:
    """
    300자 우선순위 선정:
      1. kHangul 보유 (필수)
      2. IDS 분해 성공 글자 우선
      3. 획수 낮은 순 (1~12획)
    반환: [(codepoint_str, char, data), ...]
    """
    candidates = []
    for cp_str, data in target.items():
        char = cp_to_char(cp_str)
        if not data.get("kHangul"):
            continue

        strokes_raw = data.get("kTotalStrokes", "99")
        try:
            strokes = int(strokes_raw.split()[0])
        except Exception:
            strokes = 99

        if strokes > MAX_STROKES:
            continue

        has_ids = char in ids_map_expr
        # IDS 분해 성공 글자를 우선 (0 < 1), 그 다음 획수 오름차순
        candidates.append((0 if has_ids else 1, strokes, cp_str, char, data))

    candidates.sort(key=lambda x: (x[0], x[1]))
    return [(cp, ch, d) for _, _, cp, ch, d in candidates[:TARGET_300_COUNT]]


def main():
    # 소스 데이터: 프로젝트 루트 data/
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    # 출력: hanja-app/data/
    output_dir = Path(__file__).parent.parent.parent / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    manual_chars = [a for a in sys.argv[1:] if not a.startswith("-")]

    if manual_chars:
        # 수동 지정 모드
        print(f"[수동 모드] {len(manual_chars)}개 글자 템플릿 생성")
        templates = [generate_template(char) for char in manual_chars]
    else:
        # 자동 300자 선정 모드
        print("[자동 모드] 300자 우선순위 선정 중...")
        unihan_zip = data_dir / "Unihan.zip"
        ids_path = data_dir / "ids.txt"

        if not unihan_zip.exists() or not ids_path.exists():
            print(f"  ERROR: {data_dir}에 Unihan.zip, ids.txt 파일이 필요합니다")
            sys.exit(1)

        unihan = parse_unihan(unihan_zip)
        target = filter_target(unihan)
        ids_map_expr = parse_ids_with_expr(ids_path)

        selected = select_300_chars(target, ids_map_expr)
        print(f"  → 선정 완료: {len(selected)}자")

        # Unihan 데이터에서 hangul, definition 자동 채움
        templates = []
        for cp_str, char, data in selected:
            hangul_raw = data.get("kHangul", "")
            # 첫 번째 음만 추출
            hangul = hangul_raw.split()[0].split(":")[0] if hangul_raw else ""
            definition = data.get("kDefinition", "")
            templates.append(generate_template(char, hangul=hangul, definition=definition))

        # 통계 출력
        ids_count = sum(1 for _, ch, _ in selected if ch in ids_map_expr)
        strokes_list = []
        for _, _, d in selected:
            try:
                strokes_list.append(int(d.get("kTotalStrokes", "0").split()[0]))
            except Exception:
                pass
        avg_strokes = sum(strokes_list) / len(strokes_list) if strokes_list else 0
        print(f"  → IDS 분해 성공: {ids_count}/{len(selected)} ({ids_count/len(selected):.1%})")
        print(f"  → 평균 획수: {avg_strokes:.1f}획")

    output = {
        "_instructions": {
            "목적": "의미 트리 큐레이션 입력 템플릿",
            "작성법": "각 글자의 senses 배열을 채워주세요. status를 DONE으로 변경하면 완료.",
            "relation_types": {
                "extension": "의미 확장 (더 넓은 범위로 적용)",
                "metaphor": "비유적 전이 (다른 영역으로 의미 이동)",
                "specialization": "의미 특화 (더 좁은 범위로 한정)",
            },
            "예시": TEMPLATE_EXAMPLE,
        },
        "count": len(templates),
        "chars": templates,
    }

    output_path = output_dir / "meaning_tree_input.json"
    output_path.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n템플릿 생성 완료: {output_path} ({len(templates)}개 글자)")


if __name__ == "__main__":
    main()
