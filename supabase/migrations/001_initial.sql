-- ============================================================
-- 001_initial.sql
-- Phase 1 초기 DB 스키마 — PRD v1.0 기반
-- 생성일: 2026-02-18
-- 별도 hanja 스키마 사용 (기존 public 스키마와 격리)
-- ============================================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- hanja 스키마 생성 및 권한 설정
-- ============================================================
CREATE SCHEMA IF NOT EXISTS hanja;

-- Supabase 역할에 스키마 접근 권한 부여
GRANT USAGE ON SCHEMA hanja TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA hanja TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA hanja TO anon, authenticated;

-- 향후 생성될 테이블에도 동일 권한 자동 적용
ALTER DEFAULT PRIVILEGES IN SCHEMA hanja
    GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA hanja
    GRANT SELECT ON TABLES TO anon, authenticated;

-- ============================================================
-- 1. characters — 한자 기본 메타데이터
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.characters (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    char          TEXT UNIQUE NOT NULL,         -- '清'
    codepoint     INT NOT NULL,                  -- 27141 (U+6E05)
    strokes       INT,                           -- 획수
    radical       TEXT,                          -- 부수 번호 (kRSUnicode 기반)
    unihan_def    TEXT,                          -- 영문 뜻 (kDefinition)
    grade_level   INT,                           -- 급수 (추후 추가)
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_char       ON hanja.characters (char);
CREATE INDEX IF NOT EXISTS idx_characters_codepoint  ON hanja.characters (codepoint);
CREATE INDEX IF NOT EXISTS idx_characters_strokes    ON hanja.characters (strokes);

COMMENT ON TABLE hanja.characters IS '한자 기본 메타데이터 (2,000자 대상)';
COMMENT ON COLUMN hanja.characters.char IS '한자 문자 (유니코드)';
COMMENT ON COLUMN hanja.characters.codepoint IS '유니코드 코드포인트 (정수)';

-- ============================================================
-- 2. readings — 한글 음 (kHangul)
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.readings (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id  UUID NOT NULL REFERENCES hanja.characters(id) ON DELETE CASCADE,
    type          TEXT NOT NULL DEFAULT 'kHangul',  -- 읽기 유형
    value         TEXT NOT NULL,                     -- '청'
    is_primary    BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_readings_character_id ON hanja.readings (character_id);
CREATE INDEX IF NOT EXISTS idx_readings_value        ON hanja.readings (value);

COMMENT ON TABLE hanja.readings IS '한자 읽기 (한글 음)';

-- ============================================================
-- 3. phonetic_classes — phonetic 계열
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.phonetic_classes (
    id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code  TEXT UNIQUE NOT NULL   -- kPhonetic class 코드 (예: '116')
);

COMMENT ON TABLE hanja.phonetic_classes IS 'kPhonetic 계열 코드';

-- ============================================================
-- 4. character_phonetic_class — 한자-계열 연결
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.character_phonetic_class (
    character_id      UUID NOT NULL REFERENCES hanja.characters(id) ON DELETE CASCADE,
    phonetic_class_id UUID NOT NULL REFERENCES hanja.phonetic_classes(id) ON DELETE CASCADE,
    PRIMARY KEY (character_id, phonetic_class_id)
);

CREATE INDEX IF NOT EXISTS idx_cpc_phonetic_class_id ON hanja.character_phonetic_class (phonetic_class_id);

COMMENT ON TABLE hanja.character_phonetic_class IS '한자-phonetic 계열 N:M 연결';

-- ============================================================
-- 5. decompositions — IDS 기반 분해 데이터
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.decompositions (
    character_id  UUID PRIMARY KEY REFERENCES hanja.characters(id) ON DELETE CASCADE,
    ids           TEXT,                   -- 원본 IDS 표현 (예: '⿰氵青')
    components    TEXT[] NOT NULL,        -- ['氵', '青']
    confidence    SMALLINT DEFAULT 90     -- 신뢰도 0~100
);

COMMENT ON TABLE hanja.decompositions IS 'IDS 기반 한자 분해 데이터';
COMMENT ON COLUMN hanja.decompositions.components IS '컴포넌트 배열 (최소 2개)';

-- ============================================================
-- 6. meaning_senses — 의미 노드
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.meaning_senses (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES hanja.characters(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,          -- '맑다(정화)'
    short_gloss  TEXT,                   -- 짧은 설명
    example      TEXT,                   -- 예시 단어 (예: '清水')
    sort_order   INT DEFAULT 0           -- 표시 순서
);

CREATE INDEX IF NOT EXISTS idx_meaning_senses_character_id ON hanja.meaning_senses (character_id);

COMMENT ON TABLE hanja.meaning_senses IS '의미 트리 노드 (완성형 300자 큐레이션 대상)';

-- ============================================================
-- 7. meaning_edges — 의미 트리 엣지
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.meaning_edges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id    UUID NOT NULL REFERENCES hanja.characters(id) ON DELETE CASCADE,
    parent_sense_id UUID NOT NULL REFERENCES hanja.meaning_senses(id) ON DELETE CASCADE,
    child_sense_id  UUID NOT NULL REFERENCES hanja.meaning_senses(id) ON DELETE CASCADE,
    relation        TEXT NOT NULL CHECK (relation IN ('extension', 'metaphor', 'specialization')),
    note            TEXT,
    UNIQUE (parent_sense_id, child_sense_id)
);

CREATE INDEX IF NOT EXISTS idx_meaning_edges_character_id ON hanja.meaning_edges (character_id);

COMMENT ON TABLE hanja.meaning_edges IS '의미 트리 엣지 (부모→자식 의미 관계)';
COMMENT ON COLUMN hanja.meaning_edges.relation IS 'extension(확장) / metaphor(비유) / specialization(특화)';

-- ============================================================
-- 8. user_progress — 학습 진행 상태 (Pro 티어)
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.user_progress (
    user_id        UUID NOT NULL,           -- auth.users.id
    character_id   UUID NOT NULL REFERENCES hanja.characters(id) ON DELETE CASCADE,
    state          TEXT NOT NULL DEFAULT 'new'
                   CHECK (state IN ('new', 'learning', 'mastered')),
    correct_count  INT DEFAULT 0,
    wrong_count    INT DEFAULT 0,
    next_review_at TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id       ON hanja.user_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_next_review   ON hanja.user_progress (user_id, next_review_at);

COMMENT ON TABLE hanja.user_progress IS 'SRS 학습 진행 상태 (Pro 티어 기능)';

-- ============================================================
-- 9. favorites — 즐겨찾기
-- ============================================================
CREATE TABLE IF NOT EXISTS hanja.favorites (
    user_id      UUID NOT NULL,
    character_id UUID NOT NULL REFERENCES hanja.characters(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON hanja.favorites (user_id);

COMMENT ON TABLE hanja.favorites IS '즐겨찾기 (로그인 사용자)';

-- ============================================================
-- RLS (Row Level Security) 정책
-- ============================================================

-- 공개 테이블: 로그인 없이 읽기 가능
ALTER TABLE hanja.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.phonetic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.character_phonetic_class ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.decompositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.meaning_senses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.meaning_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "공개 읽기" ON hanja.characters;
CREATE POLICY "공개 읽기" ON hanja.characters FOR SELECT USING (true);
DROP POLICY IF EXISTS "공개 읽기" ON hanja.readings;
CREATE POLICY "공개 읽기" ON hanja.readings FOR SELECT USING (true);
DROP POLICY IF EXISTS "공개 읽기" ON hanja.phonetic_classes;
CREATE POLICY "공개 읽기" ON hanja.phonetic_classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "공개 읽기" ON hanja.character_phonetic_class;
CREATE POLICY "공개 읽기" ON hanja.character_phonetic_class FOR SELECT USING (true);
DROP POLICY IF EXISTS "공개 읽기" ON hanja.decompositions;
CREATE POLICY "공개 읽기" ON hanja.decompositions FOR SELECT USING (true);
DROP POLICY IF EXISTS "공개 읽기" ON hanja.meaning_senses;
CREATE POLICY "공개 읽기" ON hanja.meaning_senses FOR SELECT USING (true);
DROP POLICY IF EXISTS "공개 읽기" ON hanja.meaning_edges;
CREATE POLICY "공개 읽기" ON hanja.meaning_edges FOR SELECT USING (true);

-- 사용자 테이블: 본인 데이터만 접근
ALTER TABLE hanja.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 데이터만" ON hanja.user_progress;
CREATE POLICY "본인 데이터만" ON hanja.user_progress
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 데이터만" ON hanja.favorites;
CREATE POLICY "본인 데이터만" ON hanja.favorites
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PostgREST에 hanja 스키마 노출 (API 접근용)
-- ============================================================
-- 주의: Supabase Dashboard > Settings > API > Exposed schemas 에서
-- "hanja"를 추가해야 클라이언트 API로 접근 가능합니다.
-- 또는 아래 SQL을 실행:
DO $$ BEGIN
  ALTER ROLE authenticator SET pgrst.db_schemas = 'public, hanja';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter authenticator role: %', SQLERRM;
END $$;
NOTIFY pgrst, 'reload schema';
