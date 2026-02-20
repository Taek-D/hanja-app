import { supabase } from './supabase';
import type {
  CharacterDetail,
  CharacterDetailInfo,
  Character,
  Reading,
  Decomposition,
  PhoneticSibling,
  MeaningSense,
  MeaningEdge,
  MeaningTreeNode,
  Lesson,
  RadicalWithCharacter,
  RelatedCharacter,
} from '@/types/hanja';

export async function getCharacterByChar(char: string): Promise<CharacterDetail | null> {
  const { data: character, error } = await supabase
    .from('characters')
    .select('*')
    .eq('char', char)
    .maybeSingle();

  if (error || !character) return null;

  const [readingsRes, decompRes] = await Promise.all([
    supabase
      .from('readings')
      .select('*')
      .eq('character_id', character.id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('decompositions')
      .select('*')
      .eq('character_id', character.id)
      .maybeSingle(),
  ]);

  return {
    ...character,
    readings: (readingsRes.data as Reading[]) || [],
    decomposition: (decompRes.data as Decomposition | null),
  };
}

export async function getPhoneticSiblings(characterId: string): Promise<{
  phoneticRoot: string | null;
  siblings: PhoneticSibling[];
}> {
  // 이 한자의 음류(phonetic class) 조회
  const { data: cpc } = await supabase
    .from('character_phonetic_class')
    .select('phonetic_class_id')
    .eq('character_id', characterId);

  if (!cpc || cpc.length === 0) {
    return { phoneticRoot: null, siblings: [] };
  }

  const classId = cpc[0].phonetic_class_id;

  // 같은 음류에 속한 모든 한자 조회
  const { data: siblingLinks } = await supabase
    .from('character_phonetic_class')
    .select('character_id')
    .eq('phonetic_class_id', classId);

  if (!siblingLinks || siblingLinks.length === 0) {
    return { phoneticRoot: null, siblings: [] };
  }

  const siblingIds = siblingLinks.map((s) => s.character_id);

  // 형제 한자의 상세 정보 조회
  const { data: chars } = await supabase
    .from('characters')
    .select('id, char, unihan_def')
    .in('id', siblingIds);

  if (!chars) return { phoneticRoot: null, siblings: [] };

  // 모든 형제 한자의 음 조회
  const { data: readings } = await supabase
    .from('readings')
    .select('character_id, value, is_primary')
    .in('character_id', siblingIds)
    .eq('is_primary', true);

  const readingMap = new Map<string, string>();
  readings?.forEach((r) => {
    readingMap.set(r.character_id, r.value);
  });

  // 공통 성부를 찾기 위한 분해 정보 조회
  const { data: decomps } = await supabase
    .from('decompositions')
    .select('character_id, components')
    .in('character_id', siblingIds);

  // 공통 부품(성부) 찾기
  let phoneticRoot: string | null = null;
  if (decomps && decomps.length >= 2) {
    const componentSets = decomps.map((d) => d.components as string[]);
    const freq = new Map<string, number>();
    componentSets.flat().forEach((c) => freq.set(c, (freq.get(c) || 0) + 1));
    let maxFreq = 0;
    freq.forEach((count, comp) => {
      if (count > maxFreq) {
        maxFreq = count;
        phoneticRoot = comp;
      }
    });
  }

  const siblings: PhoneticSibling[] = chars.map((c) => ({
    char: c.char,
    reading: readingMap.get(c.id) || '',
    meaning: c.unihan_def,
    character_id: c.id,
  }));

  return { phoneticRoot, siblings };
}

export async function getMeaningTree(characterId: string): Promise<MeaningTreeNode[]> {
  const [sensesRes, edgesRes] = await Promise.all([
    supabase
      .from('meaning_senses')
      .select('*')
      .eq('character_id', characterId)
      .order('sort_order'),
    supabase
      .from('meaning_edges')
      .select('*')
      .eq('character_id', characterId),
  ]);

  const senses = (sensesRes.data as MeaningSense[]) || [];
  const edges = (edgesRes.data as MeaningEdge[]) || [];

  if (senses.length === 0) return [];

  // 의미(sense) + 관계(edge)로 트리 구성
  const nodeMap = new Map<string, MeaningTreeNode>();
  const childIds = new Set(edges.map((e) => e.child_sense_id));

  senses.forEach((s) => {
    nodeMap.set(s.id, {
      id: s.id,
      label: s.label,
      short_gloss: s.short_gloss,
      example: s.example,
      children: [],
    });
  });

  edges.forEach((e) => {
    const parent = nodeMap.get(e.parent_sense_id);
    const child = nodeMap.get(e.child_sense_id);
    if (parent && child) {
      child.relation = e.relation;
      parent.children.push(child);
    }
  });

  // 루트 노드: 자식으로 등장하지 않는 노드
  const roots = senses
    .filter((s) => !childIds.has(s.id))
    .map((s) => nodeMap.get(s.id)!)
    .filter(Boolean);

  return roots;
}

export async function searchCharacters(
  query: string,
  limit = 20
): Promise<(Character & { reading: string })[]> {
  // 한자 직접 검색
  const { data: byChar } = await supabase
    .from('characters')
    .select('*')
    .eq('char', query)
    .limit(1);

  // 한글 음으로 검색
  const { data: byReading } = await supabase
    .from('readings')
    .select('character_id, value')
    .ilike('value', `%${query}%`)
    .limit(limit);

  const charIds = new Set<string>();
  const results: (Character & { reading: string })[] = [];

  if (byChar && byChar.length > 0) {
    const c = byChar[0] as Character;
    charIds.add(c.id);
    const { data: r } = await supabase
      .from('readings')
      .select('value')
      .eq('character_id', c.id)
      .eq('is_primary', true)
      .maybeSingle();
    results.push({ ...c, reading: r?.value || '' });
  }

  if (byReading && byReading.length > 0) {
    const ids = byReading
      .map((r) => r.character_id)
      .filter((id) => !charIds.has(id));

    if (ids.length > 0) {
      const { data: chars } = await supabase
        .from('characters')
        .select('*')
        .in('id', ids);

      const readingMap = new Map<string, string>();
      byReading.forEach((r) => readingMap.set(r.character_id, r.value));

      chars?.forEach((c) => {
        if (!charIds.has(c.id)) {
          charIds.add(c.id);
          results.push({
            ...(c as Character),
            reading: readingMap.get(c.id) || '',
          });
        }
      });
    }
  }

  return results;
}

export async function getCharacterList(options: {
  page?: number;
  pageSize?: number;
  strokes?: number;
  radical?: string;
} = {}): Promise<{ characters: (Character & { reading: string })[]; total: number }> {
  const { page = 1, pageSize = 30, strokes, radical } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('characters')
    .select('*', { count: 'exact' });

  if (strokes) query = query.eq('strokes', strokes);
  if (radical) query = query.eq('radical', radical);

  const { data: chars, count } = await query
    .order('strokes', { ascending: true })
    .range(from, to);

  if (!chars) return { characters: [], total: 0 };

  const ids = chars.map((c) => c.id);
  const { data: readings } = await supabase
    .from('readings')
    .select('character_id, value')
    .in('character_id', ids)
    .eq('is_primary', true);

  const readingMap = new Map<string, string>();
  readings?.forEach((r) => readingMap.set(r.character_id, r.value));

  const characters = chars.map((c) => ({
    ...(c as Character),
    reading: readingMap.get(c.id) || '',
  }));

  return { characters, total: count || 0 };
}

export async function getRandomCharacter(): Promise<(Character & { reading: string }) | null> {
  const { data, error } = await supabase
    .rpc('random_character' as never);

  // 대체: 랜덤 오프셋으로 조회
  if (error || !data) {
    const { count } = await supabase
      .from('characters')
      .select('*', { count: 'exact', head: true });

    if (!count) return null;

    const offset = Math.floor(Math.random() * count);
    const { data: chars } = await supabase
      .from('characters')
      .select('*')
      .range(offset, offset)
      .limit(1);

    if (!chars || chars.length === 0) return null;

    const c = chars[0] as Character;
    const { data: r } = await supabase
      .from('readings')
      .select('value')
      .eq('character_id', c.id)
      .eq('is_primary', true)
      .maybeSingle();

    return { ...c, reading: r?.value || '' };
  }

  return data as Character & { reading: string };
}

// ─── 부수/과 관련 쿼리 ───

export async function getLessons(): Promise<Lesson[]> {
  const { data } = await supabase
    .from('lessons')
    .select('*')
    .order('number');

  return (data as Lesson[]) || [];
}

export async function getAllRadicals(): Promise<RadicalWithCharacter[]> {
  const { data } = await supabase
    .from('radical_details')
    .select(`
      *,
      character:characters!character_id (id, char, codepoint, strokes, radical, unihan_def),
      lesson:lessons!lesson_id (id, number, title, theme)
    `)
    .order('radical_number');

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    character_id: row.character_id as string,
    radical_number: row.radical_number as number,
    lesson_id: row.lesson_id as number | null,
    explanation: row.explanation as string | null,
    shuowen_chinese: row.shuowen_chinese as string | null,
    shuowen_korean: row.shuowen_korean as string | null,
    variants: row.variants as string[],
    reading_hun: row.reading_hun as string | null,
    reading_eum: row.reading_eum as string | null,
    character: row.character as Character,
    lesson: row.lesson as Lesson | null,
  }));
}

export async function getRadicalsByLesson(lessonNumber: number): Promise<RadicalWithCharacter[]> {
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('number', lessonNumber)
    .maybeSingle();

  if (!lesson) return [];

  const { data } = await supabase
    .from('radical_details')
    .select(`
      *,
      character:characters!character_id (id, char, codepoint, strokes, radical, unihan_def),
      lesson:lessons!lesson_id (id, number, title, theme)
    `)
    .eq('lesson_id', lesson.id)
    .order('radical_number');

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    character_id: row.character_id as string,
    radical_number: row.radical_number as number,
    lesson_id: row.lesson_id as number | null,
    explanation: row.explanation as string | null,
    shuowen_chinese: row.shuowen_chinese as string | null,
    shuowen_korean: row.shuowen_korean as string | null,
    variants: row.variants as string[],
    reading_hun: row.reading_hun as string | null,
    reading_eum: row.reading_eum as string | null,
    character: row.character as Character,
    lesson: row.lesson as Lesson | null,
  }));
}

export async function getRelatedCharacters(radicalChar: string): Promise<RelatedCharacter[]> {
  // radical_children 테이블에서 교재 기반 관련 한자 조회
  const { data: links } = await supabase
    .from('radical_children')
    .select('child_char, sort_order')
    .eq('radical_char', radicalChar)
    .order('sort_order', { ascending: true });

  if (!links || links.length === 0) return [];

  const childChars = links.map((l) => l.child_char);

  const { data: chars } = await supabase
    .from('characters')
    .select('id, char, strokes, unihan_def')
    .in('char', childChars);

  if (!chars || chars.length === 0) return [];

  const ids = chars.map((c) => c.id);
  const { data: readings } = await supabase
    .from('readings')
    .select('character_id, value')
    .in('character_id', ids)
    .eq('is_primary', true);

  const readingMap = new Map<string, string>();
  readings?.forEach((r) => readingMap.set(r.character_id, r.value));

  // radical_children의 sort_order 순서 유지
  const charMap = new Map(chars.map((c) => [c.char, c]));
  return childChars
    .filter((ch) => charMap.has(ch))
    .map((ch) => {
      const c = charMap.get(ch)!;
      return {
        id: c.id,
        char: c.char,
        strokes: c.strokes,
        unihan_def: c.unihan_def,
        reading: readingMap.get(c.id) || '',
      };
    });
}

export async function getCharacterDetails(char: string): Promise<CharacterDetailInfo | null> {
  // characters에서 char로 조회
  const { data: character } = await supabase
    .from('characters')
    .select('id, char, codepoint, strokes, radical, unihan_def, grade_level, created_at')
    .eq('char', char)
    .maybeSingle();

  if (!character) return null;

  // character_details와 reading을 병렬로 조회
  const [detailRes, readingRes] = await Promise.all([
    supabase
      .from('character_details')
      .select('*')
      .eq('character_id', character.id)
      .maybeSingle(),
    supabase
      .from('readings')
      .select('value')
      .eq('character_id', character.id)
      .eq('is_primary', true)
      .maybeSingle(),
  ]);

  if (!detailRes.data) return null;

  return {
    character_id: detailRes.data.character_id,
    explanation: detailRes.data.explanation,
    shuowen_chinese: detailRes.data.shuowen_chinese,
    shuowen_korean: detailRes.data.shuowen_korean,
    character: character as Character,
    reading: readingRes.data?.value || '',
  };
}

export async function getRadicalByNumber(radicalNumber: number): Promise<RadicalWithCharacter | null> {
  const { data } = await supabase
    .from('radical_details')
    .select(`
      *,
      character:characters!character_id (id, char, codepoint, strokes, radical, unihan_def),
      lesson:lessons!lesson_id (id, number, title, theme)
    `)
    .eq('radical_number', radicalNumber)
    .maybeSingle();

  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    character_id: row.character_id as string,
    radical_number: row.radical_number as number,
    lesson_id: row.lesson_id as number | null,
    explanation: row.explanation as string | null,
    shuowen_chinese: row.shuowen_chinese as string | null,
    shuowen_korean: row.shuowen_korean as string | null,
    variants: row.variants as string[],
    reading_hun: row.reading_hun as string | null,
    reading_eum: row.reading_eum as string | null,
    character: row.character as Character,
    lesson: row.lesson as Lesson | null,
  };
}
