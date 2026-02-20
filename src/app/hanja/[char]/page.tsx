"use client";

import { use, useState, useEffect } from "react";
import { useCharacter } from "@/hooks/useCharacter";
import { useFavorites } from "@/hooks/useFavorites";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { renderExplanation } from "@/lib/renderExplanation";
import { parseImageKey } from "@/lib/imageChar";
import CharacterHeader from "@/components/CharacterHeader";
import AssemblyTab from "@/components/AssemblyTab";
import DerivationTab from "@/components/DerivationTab";
import MeaningTab from "@/components/MeaningTab";
import Toast from "@/components/Toast";
import Link from "next/link";

export default function HanjaDetailPage({
  params,
}: {
  params: Promise<{ char: string }>;
}) {
  const { char: rawChar } = use(params);
  const char = decodeURIComponent(rawChar);
  const { character, charDetails, phoneticRoot, siblings, meaningTree, loading, error } = useCharacter(char);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [, setRecentChars] = useLocalStorage<string[]>("hanja-recent", []);
  const [showShuowen, setShowShuowen] = useState(false);

  // 최근 본 한자 기록
  useEffect(() => {
    if (char) {
      setRecentChars((prev) => {
        const filtered = prev.filter((c) => c !== char);
        return [char, ...filtered].slice(0, 20);
      });
    }
  }, [char, setRecentChars]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="font-[var(--font-hanja)] text-6xl mb-4 animate-pulse">
            {char.startsWith("img:") ? "..." : char}
          </div>
          <div className="text-text-secondary text-sm">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5">
        <div className="text-5xl mb-4">&#128533;</div>
        <div className="text-lg font-semibold mb-2">
          {error || `"${char}" — 찾을 수 없습니다`}
        </div>
        <Link
          href="/"
          className="mt-4 bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold no-underline"
        >
          홈으로
        </Link>
      </div>
    );
  }

  const primaryReading = character.readings.find((r) => r.is_primary)?.value
    || character.readings[0]?.value || "";

  const hasPhonetic = character.decomposition?.components
    && character.decomposition.components.length >= 2;
  const charType = hasPhonetic ? "형성자" : "회의자";

  const hasShuowen = charDetails?.shuowen_chinese || charDetails?.shuowen_korean;

  // img:NNN:CC 형식 (이미지 기반 한자) 감지
  const imgSuffix = parseImageKey(char);
  const isImageEntry = !!imgSuffix;
  const hexCode = isImageEntry
    ? null
    : char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0");

  return (
    <>
      <Toast />

      {/* 뒤로가기 버튼 */}
      <div className="bg-surface px-4 pt-3 flex items-center gap-2">
        <Link
          href="/"
          className="text-text-secondary hover:text-primary transition-colors no-underline text-sm flex items-center gap-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          홈
        </Link>

        {/* 소속 부수 링크 */}
        {character.radical && (
          <Link
            href={`/radicals`}
            className="text-text-secondary hover:text-primary transition-colors no-underline text-xs ml-auto"
          >
            부수: {character.radical}
          </Link>
        )}
      </div>

      <CharacterHeader
        character={character}
        isFavorite={isFavorite(char)}
        onToggleFavorite={() => toggleFavorite(char)}
      />

      {/* ─── 교재 기반 세부 내용 (character_details 존재 시) ─── */}
      {charDetails && (
        <>
          {/* 字形變化 차트 */}
          <section className="px-5 pt-5 pb-2">
            <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2 mb-3">
              字形變化
            </h2>
            <div className="bg-surface border border-border rounded-xl p-3 overflow-x-auto">
              {/* eslint-disable @next/next/no-img-element */}
              <img
                src={isImageEntry
                  ? `/glyphs/chart_img_${imgSuffix}.png`
                  : `/glyphs/chart_c_${hexCode}.png`
                }
                alt={`${primaryReading} 字形變化 (갑골문·금문·소전)`}
                className="w-full h-auto"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </section>

          {/* 字形 解說 */}
          {charDetails.explanation && (
            <section className="px-5 py-4">
              <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2 mb-3">
                字形 解說
              </h2>
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-[15px] leading-relaxed text-text">
                  {renderExplanation(charDetails.explanation)}
                </p>
              </div>
            </section>
          )}

          {/* 說文解字 */}
          {hasShuowen && (
            <section className="px-5 pb-5">
              <button
                onClick={() => setShowShuowen(!showShuowen)}
                className="flex items-center gap-2 text-sm font-bold text-primary border-l-3 border-primary pl-2 mb-3 bg-transparent border-0 cursor-pointer"
              >
                說文解字
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${showShuowen ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showShuowen && (
                <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                  {charDetails.shuowen_chinese && (
                    <div>
                      <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                        原文
                      </div>
                      <p className="font-[var(--font-hanja)] text-base leading-relaxed text-text">
                        {charDetails.shuowen_chinese}
                      </p>
                    </div>
                  )}
                  {charDetails.shuowen_korean && (
                    <div>
                      <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                        번역
                      </div>
                      <p className="text-[15px] leading-relaxed text-text">
                        {charDetails.shuowen_korean}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ─── 기존 Unihan 기반 뷰 (이미지 기반 한자에는 표시하지 않음) ─── */}
      {!isImageEntry && (
        <>
          {/* 섹션 1: 분해(조립) */}
          <div className="px-5 pt-6 pb-1">
            <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2">분해(조립)</h2>
          </div>
          <AssemblyTab
            char={char}
            reading={primaryReading}
            decomposition={character.decomposition}
          />

          {/* 섹션 2: 계열(파생) */}
          <div className="px-5 pt-6 pb-1">
            <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2">계열(파생)</h2>
          </div>
          <DerivationTab
            currentChar={char}
            phoneticRoot={phoneticRoot}
            siblings={siblings}
            charType={charType}
          />

          {/* 섹션 3: 의미 변화 */}
          <div className="px-5 pt-6 pb-1">
            <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2">의미 변화</h2>
          </div>
          <MeaningTab
            unihanDef={character.unihan_def}
            meaningTree={meaningTree}
          />
        </>
      )}

      {/* 하단 여백 */}
      <div className="h-20" />
    </>
  );
}
