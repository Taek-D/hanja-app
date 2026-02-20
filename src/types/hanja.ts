export interface Character {
  id: string;
  char: string;
  codepoint: number;
  strokes: number | null;
  radical: string | null;
  unihan_def: string | null;
  grade_level: number | null;
  created_at: string;
}

export interface Reading {
  id: string;
  character_id: string;
  type: string;
  value: string;
  is_primary: boolean;
}

export interface Decomposition {
  character_id: string;
  ids: string | null;
  components: string[];
  confidence: number;
}

export interface PhoneticClass {
  id: string;
  code: string;
}

export interface CharacterPhoneticClass {
  character_id: string;
  phonetic_class_id: string;
}

export interface MeaningSense {
  id: string;
  character_id: string;
  label: string;
  short_gloss: string | null;
  example: string | null;
  sort_order: number;
}

export interface MeaningEdge {
  id: string;
  character_id: string;
  parent_sense_id: string;
  child_sense_id: string;
  relation: 'extension' | 'metaphor' | 'specialization';
  note: string | null;
}

export interface UserProgress {
  user_id: string;
  character_id: string;
  state: 'new' | 'learning' | 'mastered';
  correct_count: number;
  wrong_count: number;
  next_review_at: string | null;
  updated_at: string;
}

export interface Favorite {
  user_id: string;
  character_id: string;
  created_at: string;
}

export interface Lesson {
  id: number;
  number: number;
  title: string;
  theme: string | null;
}

export interface RadicalDetail {
  character_id: string;
  radical_number: number;
  lesson_id: number | null;
  explanation: string | null;
  shuowen_chinese: string | null;
  shuowen_korean: string | null;
  variants: string[];
  reading_hun: string | null;
  reading_eum: string | null;
}

// 프론트엔드용 조합 타입
export interface RadicalWithCharacter extends RadicalDetail {
  character: Character;
  lesson: Lesson | null;
}

// 프론트엔드용 조인/뷰 타입
export interface CharacterDetail {
  id: string;
  char: string;
  codepoint: number;
  strokes: number | null;
  radical: string | null;
  unihan_def: string | null;
  readings: Reading[];
  decomposition: Decomposition | null;
}

export interface PhoneticSibling {
  char: string;
  reading: string;
  meaning: string | null;
  character_id: string;
}

export interface MeaningTreeNode {
  id: string;
  label: string;
  short_gloss: string | null;
  example: string | null;
  relation?: 'extension' | 'metaphor' | 'specialization';
  children: MeaningTreeNode[];
}

export interface RelatedCharacter {
  id: string;
  char: string;
  strokes: number | null;
  unihan_def: string | null;
  reading: string;
}

export interface CharacterDetailInfo {
  character_id: string;
  explanation: string | null;
  shuowen_chinese: string | null;
  shuowen_korean: string | null;
  character: Character;
  reading: string;
}
