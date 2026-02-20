import React from "react";

/**
 * explanation 텍스트에서 글리프 마커를 인라인 이미지로 변환.
 *
 * 지원 패턴:
 * - {{glyph:NNN_NN}} — 부수 글리프 (inline_NNN_NN.png)
 * - {{glyph:c_XXXX_NN}} — 관련 한자 글리프 (inline_c_XXXX_NN.png)
 * - {{glyph:img_NNN_CC_NN}} — 이미지 기반 한자 글리프 (inline_img_NNN_CC_NN.png)
 */
export function renderExplanation(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{glyph:[^}]+\}\})/);
  return parts.map((part, i) => {
    // 부수 글리프: {{glyph:NNN_NN}}
    const radicalMatch = part.match(/^\{\{glyph:(\d{3}_\d{2})\}\}$/);
    if (radicalMatch) {
      /* eslint-disable @next/next/no-img-element */
      return (
        <img
          key={i}
          src={`/glyphs/inline_${radicalMatch[1]}.png`}
          alt="glyph"
          width={20}
          height={20}
          className="inline-block align-middle mx-0.5"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }

    // 관련 한자 글리프: {{glyph:c_XXXX_NN}}
    const charMatch = part.match(/^\{\{glyph:(c_[0-9A-F]{4}_\d{2})\}\}$/);
    if (charMatch) {
      return (
        <img
          key={i}
          src={`/glyphs/inline_${charMatch[1]}.png`}
          alt="glyph"
          width={20}
          height={20}
          className="inline-block align-middle mx-0.5"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }

    // 이미지 기반 한자 글리프: {{glyph:img_NNN_CC_NN}}
    const imgMatch = part.match(/^\{\{glyph:(img_\d{3}_\d{2}_\d{2})\}\}$/);
    if (imgMatch) {
      return (
        <img
          key={i}
          src={`/glyphs/inline_${imgMatch[1]}.png`}
          alt="glyph"
          width={20}
          height={20}
          className="inline-block align-middle mx-0.5"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }

    return <span key={i}>{part}</span>;
  });
}
