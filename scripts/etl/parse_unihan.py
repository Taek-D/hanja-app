"""
parse_unihan.py — spike.py에서 추출한 Unihan 파싱 모듈
Phase 1 ETL 파이프라인 컴포넌트

사용법:
    from scripts.etl.parse_unihan import parse_unihan, filter_target, cp_to_char
"""

import zipfile
from pathlib import Path
from collections import defaultdict

UNIHAN_FIELDS = {
    "kHangul",       # 한글 음
    "kDefinition",   # 영문 뜻 (의미 참고용)
    "kPhonetic",     # phonetic class (파생 계열)
    "kTotalStrokes", # 획수
    "kRSUnicode",    # 부수+획수
}

TARGET_COUNT = 2000


def cp_to_char(cp_str: str) -> str:
    """'U+6E05' → '清'"""
    return chr(int(cp_str[2:], 16))


def parse_unihan(zip_path: Path) -> dict[str, dict]:
    """
    Unihan.zip에서 필요한 필드를 파싱하여 반환
    반환: {codepoint_str: {field: value}}
    """
    chars: dict[str, dict] = defaultdict(dict)

    target_files = {
        "Unihan_Readings.txt",
        "Unihan_DictionaryLikeData.txt",
        "Unihan_IRGSources.txt",  # kTotalStrokes, kRSUnicode
    }

    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if name not in target_files:
                continue
            print(f"  [parse] {name}")
            with zf.open(name) as f:
                for raw in f:
                    line = raw.decode("utf-8", errors="ignore").rstrip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split("\t")
                    if len(parts) < 3:
                        continue
                    cp_str, field, value = parts[0], parts[1], parts[2]
                    if field not in UNIHAN_FIELDS:
                        continue
                    chars[cp_str][field] = value

    return dict(chars)


def filter_target(unihan: dict, count: int = TARGET_COUNT) -> dict:
    """
    kHangul이 있는 항목만 추출 (한국어권 학습 대상)
    획수 오름차순으로 count개 제한
    """
    filtered = {
        cp: data for cp, data in unihan.items()
        if "kHangul" in data
    }

    def sort_key(item):
        strokes = item[1].get("kTotalStrokes", "99")
        try:
            return int(strokes.split()[0])
        except Exception:
            return 99

    sorted_items = sorted(filtered.items(), key=sort_key)
    return dict(sorted_items[:count])


if __name__ == "__main__":
    from pathlib import Path
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    unihan = parse_unihan(data_dir / "Unihan.zip")
    target = filter_target(unihan)
    print(f"전체 Unihan 항목: {len(unihan):,}개")
    print(f"kHangul 보유 (학습 대상): {len(target):,}개")
