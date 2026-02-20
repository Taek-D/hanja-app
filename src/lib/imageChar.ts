/**
 * img:NNN:CC 형식(이미지 기반 한자)의 공용 유틸.
 *
 * 일부 한자는 유니코드에 독립 코드포인트가 없어
 * PDF에서 이미지로만 렌더링되며, "img:005:02" 같은 합성 키로 저장된다.
 */

/** img:NNN:CC → "NNN_CC" suffix 반환. 아니면 null. */
export function parseImageKey(char: string): string | null {
  const m = char.match(/^img:(\d{3}):(\d{2})$/);
  return m ? `${m[1]}_${m[2]}` : null;
}

/** img:NNN:CC → 대표 이미지 경로 반환. 아니면 null. */
export function getCharImageSrc(char: string): string | null {
  const suffix = parseImageKey(char);
  return suffix ? `/glyphs/char_img_${suffix}.png` : null;
}
