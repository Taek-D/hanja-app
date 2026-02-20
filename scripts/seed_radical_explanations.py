"""
214부수해설 PDF에서 추출한 데이터를 Supabase에 삽입하는 스크립트.
첫 5개 부수(一, 冖, 至, 二, 爻)만 테스트 삽입.
"""

import json
import os
import urllib.request
import urllib.parse
import uuid
import sys

SUPABASE_URL = "https://yidyxlwrongecctifiis.supabase.co/rest/v1"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_SERVICE_KEY 환경변수가 필요합니다.")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Content-Profile": "hanja",
    "Accept-Profile": "hanja",
    "Prefer": "return=representation",
}


def api_get(path: str) -> list:
    req = urllib.request.Request(f"{SUPABASE_URL}/{path}", headers=HEADERS)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())


def api_post(path: str, data: list | dict) -> list:
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{SUPABASE_URL}/{path}", data=body, headers=HEADERS, method="POST")
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())


def api_patch(path: str, data: dict) -> list:
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{SUPABASE_URL}/{path}", data=body, headers=HEADERS, method="PATCH")
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())


def api_delete(path: str):
    req = urllib.request.Request(f"{SUPABASE_URL}/{path}", headers=HEADERS, method="DELETE")
    resp = urllib.request.urlopen(req)
    return resp.read()


# ─── 1단계: 기존 한자 확인 및 冖 삽입 ───

chars_to_check = ["一", "冖", "至", "二", "爻"]
encoded = urllib.parse.quote(",".join(chars_to_check))
existing = api_get(f"characters?char=in.({encoded})&select=id,char,unihan_def,strokes,radical")

char_map: dict[str, dict] = {}
for c in existing:
    char_map[c["char"]] = c

print("=== 기존 한자 확인 ===")
for ch in chars_to_check:
    if ch in char_map:
        print(f"  {ch}: 있음 (id={char_map[ch]['id'][:8]}...)")
    else:
        print(f"  {ch}: 없음 → 삽입 필요")

# 冖이 없으면 삽입
if "冖" not in char_map:
    print("\n冖 삽입 중...")
    new_char = api_post("characters", {
        "char": "冖",
        "codepoint": ord("冖"),
        "strokes": 2,
        "radical": "冖",
        "unihan_def": "cover; KangXi radical 14",
    })
    char_map["冖"] = new_char[0]
    print(f"  삽입 완료: id={new_char[0]['id'][:8]}...")

    # 冖의 음 삽입
    api_post("readings", {
        "character_id": char_map["冖"]["id"],
        "type": "hangul",
        "value": "멱",
        "is_primary": True,
    })
    print("  음(멱) 삽입 완료")


# ─── 2단계: unihan_def를 한국어로 업데이트 ───

korean_defs = {
    "一": "하나, 첫째, 하늘, 온통",
    "冖": "덮다, 씌우다",
    "至": "이르다, 도달하다, 지극하다",
    "二": "둘, 하늘과 땅",
    "爻": "효(주역의 괘를 이루는 기호), 엇갈리다",
}

print("\n=== unihan_def 한국어 업데이트 ===")
for ch, korean_def in korean_defs.items():
    cid = char_map[ch]["id"]
    api_patch(f"characters?id=eq.{cid}", {"unihan_def": korean_def})
    print(f"  {ch}: {korean_def}")


# ─── 3단계: 기존 meaning_senses / meaning_edges 삭제 (재실행 가능하도록) ───

print("\n=== 기존 의미 데이터 정리 ===")
for ch in chars_to_check:
    cid = char_map[ch]["id"]
    api_delete(f"meaning_edges?character_id=eq.{cid}")
    api_delete(f"meaning_senses?character_id=eq.{cid}")
    print(f"  {ch}: 기존 데이터 삭제")


# ─── 4단계: meaning_senses + meaning_edges 삽입 ───

# PDF에서 추출한 의미 트리 데이터
MEANING_DATA = {
    "一": {
        "senses": [
            {
                "label": "하나",
                "short_gloss": "숫자 1을 뜻하는 지사자. 갑골문·금문·소전 모두 같은 모양.",
                "example": "說文: 惟初太始, 道立于一, 造分天地, 化成萬物",
                "sort_order": 1,
            },
            {
                "label": "하늘",
                "short_gloss": "만물을 오직 하나로 덮고 있는 하늘을 뜻하는 글자로도 사용.",
                "example": "하늘은 만물을 덮고, 땅은 만물을 실었다",
                "sort_order": 2,
            },
            {
                "label": "가장 크다·맨 처음",
                "short_gloss": "하늘에서 파생되어 가장 크다, 맨 처음이라는 의미를 가짐.",
                "example": "一統 (통일하다), 一切 (모든 것)",
                "sort_order": 3,
            },
        ],
        "edges": [
            (0, 1, "extension"),  # 하나 → 하늘
            (1, 2, "metaphor"),   # 하늘 → 가장 크다
        ],
    },
    "冖": {
        "senses": [
            {
                "label": "덮다",
                "short_gloss": "'一'자를 아래로 늘어뜨려 자루를 뒤집어 씌워 덮는다는 뜻.",
                "example": "說文: 覆也. 从一下垂也",
                "sort_order": 1,
            },
            {
                "label": "모자",
                "short_gloss": "어린이나 이민족의 모자를 뜻함.",
                "example": "冠 (갓 관) — 冖이 머리를 덮는 모양",
                "sort_order": 2,
            },
            {
                "label": "무릅쓰다",
                "short_gloss": "덮어쓰고 앞으로 나아간다는 뜻으로 확장.",
                "example": "冒 (무릅쓸 모) — 무릅쓰고 나아가다",
                "sort_order": 3,
            },
        ],
        "edges": [
            (0, 1, "extension"),     # 덮다 → 모자
            (0, 2, "metaphor"),      # 덮다 → 무릅쓰다
        ],
    },
    "至": {
        "senses": [
            {
                "label": "이르다·도달하다",
                "short_gloss": "화살(矢)을 거꾸로 하여 땅에 꽂힌 모양. 화살이 날아가 도달했다는 뜻.",
                "example": "說文: 鳥飛从高下至地也",
                "sort_order": 1,
            },
            {
                "label": "돌아오다",
                "short_gloss": "날아간 것은 반드시 돌아온다는 의미. '不'(떠남)의 반대.",
                "example": "'不'은 위로 올라가는 것이고, '至'는 아래로 내려오는 것",
                "sort_order": 2,
            },
            {
                "label": "지극하다",
                "short_gloss": "이르러 끝에 도달했다는 뜻에서 지극하다, 더할 나위 없다로 확장.",
                "example": "至善 (지극한 선), 至高 (가장 높은)",
                "sort_order": 3,
            },
        ],
        "edges": [
            (0, 1, "extension"),       # 이르다 → 돌아오다
            (0, 2, "metaphor"),        # 이르다 → 지극하다
        ],
    },
    "二": {
        "senses": [
            {
                "label": "둘",
                "short_gloss": "'一'에 '一'을 더하여 숫자 2를 나타낸 지사자.",
                "example": "說文: 地之數也. 从偶一",
                "sort_order": 1,
            },
            {
                "label": "하늘과 땅",
                "short_gloss": "윗 '一'은 하늘, 아랫 '一'은 하늘과 짝하는 땅을 의미.",
                "example": "二元 (두 가지 근원 — 하늘과 땅)",
                "sort_order": 2,
            },
        ],
        "edges": [
            (0, 1, "metaphor"),  # 둘 → 하늘과 땅
        ],
    },
    "爻": {
        "senses": [
            {
                "label": "엇갈리다·교차하다",
                "short_gloss": "나뭇가지를 꺾어 수를 세는 모양의 상형문자.",
                "example": "說文: 交也. 象易六爻頭交也",
                "sort_order": 1,
            },
            {
                "label": "주역의 효",
                "short_gloss": "《易》의 육효가 서로 엇갈려있는 모양을 그린 것.",
                "example": "六爻 (여섯 효 — 괘를 이루는 기호)",
                "sort_order": 2,
            },
        ],
        "edges": [
            (0, 1, "specialization"),  # 엇갈리다 → 주역의 효
        ],
    },
}

print("\n=== 의미 트리 삽입 ===")
for ch, tree in MEANING_DATA.items():
    cid = char_map[ch]["id"]
    sense_ids: list[str] = []

    # meaning_senses 삽입
    for sense in tree["senses"]:
        new_id = str(uuid.uuid4())
        sense_ids.append(new_id)
        api_post("meaning_senses", {
            "id": new_id,
            "character_id": cid,
            "label": sense["label"],
            "short_gloss": sense["short_gloss"],
            "example": sense["example"],
            "sort_order": sense["sort_order"],
        })

    # meaning_edges 삽입
    for parent_idx, child_idx, relation in tree["edges"]:
        api_post("meaning_edges", {
            "id": str(uuid.uuid4()),
            "character_id": cid,
            "parent_sense_id": sense_ids[parent_idx],
            "child_sense_id": sense_ids[child_idx],
            "relation": relation,
        })

    sense_count = len(tree["senses"])
    edge_count = len(tree["edges"])
    print(f"  {ch}: 의미 {sense_count}개, 관계 {edge_count}개 삽입 완료")


# ─── 5단계: 검증 ───

print("\n=== 삽입 결과 검증 ===")
for ch in chars_to_check:
    cid = char_map[ch]["id"]
    senses = api_get(f"meaning_senses?character_id=eq.{cid}&select=label,short_gloss&order=sort_order")
    edges = api_get(f"meaning_edges?character_id=eq.{cid}&select=relation")
    print(f"\n  {ch} ({korean_defs[ch]}):")
    for s in senses:
        print(f"    - {s['label']}: {s['short_gloss'][:40]}...")
    print(f"    관계: {[e['relation'] for e in edges]}")

print("\n완료! http://localhost:3000/hanja/一 에서 확인하세요.")
