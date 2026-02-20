"""
parse_ids.py — spike.py에서 추출한 IDS 파싱 모듈
Phase 1 ETL 파이프라인 컴포넌트

사용법:
    from scripts.etl.parse_ids import parse_ids, extract_components
"""

from pathlib import Path

# IDS 제어 문자 (⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻)
IDS_OPERATORS = set("⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻")


def extract_components(ids_expr: str) -> list[str]:
    """
    IDS 표현에서 리프 컴포넌트만 추출
    '⿰氵青' → ['氵', '青']
    """
    components = []
    for ch in ids_expr:
        if ch in IDS_OPERATORS:
            continue
        # 한자 범위만 (CJK Unified Ideographs + Radicals 등)
        cp = ord(ch)
        if (
            0x4E00 <= cp <= 0x9FFF    # CJK 기본
            or 0x3400 <= cp <= 0x4DBF  # CJK 확장 A
            or 0x2E80 <= cp <= 0x2EFF  # CJK Radicals Supplement
            or 0x2F00 <= cp <= 0x2FDF  # Kangxi Radicals
            or 0x31C0 <= cp <= 0x31EF  # CJK Strokes
        ):
            components.append(ch)

    # 컴포넌트가 글자 자신 하나뿐이면 분해 불가로 처리
    return components if len(components) >= 2 else []


def parse_ids_with_expr(ids_path: Path) -> dict[str, dict]:
    """
    IDS 파일을 파싱하여 글자 → {components, ids_expr} 반환
    예: '清' → {"components": ['氵', '青'], "ids_expr": "⿰氵青"}

    Phase 0-A 실측: 2,000자 중 90.6% (1,813자) 분해 성공
    """
    result: dict[str, dict] = {}

    with ids_path.open(encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 3:
                continue

            char = parts[1]
            # 여러 IDS 표현 중 첫 번째 사용
            ids_expr = parts[2]

            components = extract_components(ids_expr)
            if components:
                result[char] = {
                    "components": components,
                    "ids_expr": ids_expr,
                }

    return result


def parse_ids(ids_path: Path) -> dict[str, list[str]]:
    """
    IDS 파일을 파싱하여 글자 → 컴포넌트 리스트 반환 (하위호환)
    예: '清' → ['氵', '青']
    """
    full = parse_ids_with_expr(ids_path)
    return {char: data["components"] for char, data in full.items()}


if __name__ == "__main__":
    from pathlib import Path
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    ids_map = parse_ids(data_dir / "ids.txt")
    print(f"IDS 항목 수: {len(ids_map):,}개")
    # 예시 출력
    sample_chars = ["清", "語", "明", "學", "國"]
    for char in sample_chars:
        comps = ids_map.get(char, [])
        print(f"  {char} → {comps}")
