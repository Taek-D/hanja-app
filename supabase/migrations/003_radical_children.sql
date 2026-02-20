-- 부수별 관련 한자 (교재 기반 교육적 분류)
-- characters.radical 필드는 사전학적 부수 (Kangxi radical) 용도
-- 이 테이블은 교재에서 부수 아래 해설하는 한자 목록

CREATE TABLE IF NOT EXISTS hanja.radical_children (
  radical_char TEXT NOT NULL,       -- 부모 부수 한자 (예: 一, 示, 目)
  child_char   TEXT NOT NULL,       -- 관련 한자 (예: 上, 祭, 眉)
  sort_order   INT DEFAULT 0,       -- 교재 내 순서
  PRIMARY KEY (radical_char, child_char)
);

-- RLS 정책
ALTER TABLE hanja.radical_children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "radical_children_read" ON hanja.radical_children;
CREATE POLICY "radical_children_read"
  ON hanja.radical_children FOR SELECT
  USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_radical_children_radical
  ON hanja.radical_children (radical_char);
