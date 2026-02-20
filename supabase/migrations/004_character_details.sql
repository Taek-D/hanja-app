-- ============================================================
-- 004_character_details.sql
-- 관련 한자 세부 정보 (字形解說, 說文解字)
-- radical_details와 유사하되 부수 전용 필드 제외
-- ============================================================

CREATE TABLE IF NOT EXISTS hanja.character_details (
    character_id    UUID PRIMARY KEY REFERENCES hanja.characters(id) ON DELETE CASCADE,
    explanation     TEXT,           -- 字形 解說 전문
    shuowen_chinese TEXT,           -- 說文解字 한문 원문
    shuowen_korean  TEXT            -- 說文解字 한국어 번역
);

COMMENT ON TABLE hanja.character_details IS '관련 한자 세부 정보 (중급해설 PDF 추출)';
COMMENT ON COLUMN hanja.character_details.explanation IS '字形 解說 전문 텍스트';
COMMENT ON COLUMN hanja.character_details.shuowen_chinese IS '說文解字 한문 원문 인용';
COMMENT ON COLUMN hanja.character_details.shuowen_korean IS '說文解字 한국어 번역';

-- ============================================================
-- RLS 정책
-- ============================================================
ALTER TABLE hanja.character_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "공개 읽기" ON hanja.character_details;
CREATE POLICY "공개 읽기" ON hanja.character_details FOR SELECT USING (true);

-- ============================================================
-- 기본 권한
-- ============================================================
GRANT SELECT ON hanja.character_details TO anon, authenticated;
GRANT ALL ON hanja.character_details TO service_role;
