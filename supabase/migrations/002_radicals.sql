-- ============================================================
-- 002_radicals.sql
-- 214부수 중심 스키마 확장
-- 기존 characters/readings/meaning_senses 등은 유지
-- ============================================================

-- ============================================================
-- 1. lessons — 13과(課) 구성
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.lessons (
    id          SERIAL PRIMARY KEY,
    number      INT UNIQUE NOT NULL,           -- 1~13
    title       TEXT NOT NULL,                  -- '第一課'
    theme       TEXT                            -- '숫자/천문'
);

COMMENT ON TABLE hanja.lessons IS '214부수해설 13과 구성';

INSERT INTO hanja.lessons (number, title, theme) VALUES
    (1,  '第一課',    '숫자·천문'),
    (2,  '第二課',    '자연'),
    (3,  '第三課',    '식물·곡물'),
    (4,  '第四課',    '동물'),
    (5,  '第五課',    '사람·신체'),
    (6,  '第六課',    '감각기관'),
    (7,  '第七課',    '행동·이동'),
    (8,  '第八課',    '건축·지리'),
    (9,  '第九課',    '도구·운송'),
    (10, '第十課',    '용기·그릇'),
    (11, '第十一課',  '직물·의복'),
    (12, '第十二課',  '무기'),
    (13, '第十三課',  '기타 부호')
ON CONFLICT (number) DO NOTHING;

-- ============================================================
-- 2. radical_details — 부수 상세 정보 (PDF 추출 데이터)
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.radical_details (
    character_id    UUID PRIMARY KEY REFERENCES hanja.characters(id) ON DELETE CASCADE,
    radical_number  INT UNIQUE NOT NULL,           -- 1~214
    lesson_id       INT REFERENCES hanja.lessons(id),
    explanation     TEXT,                           -- 字形 解說 전문
    shuowen_chinese TEXT,                          -- 說文解字 한문 원문
    shuowen_korean  TEXT,                          -- 說文解字 한국어 번역
    variants        TEXT[] DEFAULT '{}',           -- 변형자 배열 ['川', '巛']
    reading_hun     TEXT,                          -- 훈 (뜻)
    reading_eum     TEXT                           -- 음 (소리)
);

CREATE INDEX IF NOT EXISTS idx_radical_details_lesson   ON hanja.radical_details (lesson_id);
CREATE INDEX IF NOT EXISTS idx_radical_details_number   ON hanja.radical_details (radical_number);

COMMENT ON TABLE hanja.radical_details IS '214부수 상세 정보 (PDF 추출)';
COMMENT ON COLUMN hanja.radical_details.explanation IS '字形 解說 전문 텍스트';
COMMENT ON COLUMN hanja.radical_details.shuowen_chinese IS '說文解字 한문 원문 인용';
COMMENT ON COLUMN hanja.radical_details.variants IS '변형자/이체자 배열';

-- ============================================================
-- RLS 정책
-- ============================================================
ALTER TABLE hanja.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.radical_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "공개 읽기" ON hanja.lessons;
CREATE POLICY "공개 읽기" ON hanja.lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "공개 읽기" ON hanja.radical_details;
CREATE POLICY "공개 읽기" ON hanja.radical_details FOR SELECT USING (true);

-- ============================================================
-- 기본 권한
-- ============================================================
GRANT SELECT ON hanja.lessons TO anon, authenticated;
GRANT ALL ON hanja.lessons TO service_role;
GRANT SELECT ON hanja.radical_details TO anon, authenticated;
GRANT ALL ON hanja.radical_details TO service_role;
GRANT USAGE, SELECT ON SEQUENCE hanja.lessons_id_seq TO service_role;
