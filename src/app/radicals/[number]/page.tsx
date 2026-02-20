"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getRadicalByNumber, getRelatedCharacters } from "@/lib/queries";
import { renderExplanation } from "@/lib/renderExplanation";
import { getCharImageSrc } from "@/lib/imageChar";
import type { RadicalWithCharacter, RelatedCharacter } from "@/types/hanja";

export default function RadicalDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number: numStr } = use(params);
  const radicalNumber = parseInt(numStr, 10);
  const [radical, setRadical] = useState<RadicalWithCharacter | null>(null);
  const [relatedChars, setRelatedChars] = useState<RelatedCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShuowen, setShowShuowen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (Number.isNaN(radicalNumber)) {
        setRadical(null);
        setRelatedChars([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getRadicalByNumber(radicalNumber);
        if (cancelled) return;
        setRadical(data);

        if (data) {
          const related = await getRelatedCharacters(data.character.char);
          if (cancelled) return;
          setRelatedChars(related);
        } else {
          setRelatedChars([]);
        }
      } catch {
        if (cancelled) return;
        setRadical(null);
        setRelatedChars([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [radicalNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">#{radicalNumber}</div>
          <div className="text-text-secondary text-sm">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!radical) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5">
        <div className="text-5xl mb-4">?</div>
        <div className="text-lg font-semibold mb-2">
          부수 #{radicalNumber}을 찾을 수 없습니다
        </div>
        <Link
          href="/radicals"
          className="mt-4 bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold no-underline"
        >
          부수 목록
        </Link>
      </div>
    );
  }

  const hasShuowen = radical.shuowen_chinese || radical.shuowen_korean;
  const hasVariants = radical.variants && radical.variants.length > 0;

  return (
    <>
      {/* 상단 네비 */}
      <div className="bg-surface px-4 pt-3 flex items-center justify-between">
        <Link
          href="/radicals"
          className="text-text-secondary hover:text-primary transition-colors no-underline text-sm flex items-center gap-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          부수 목록
        </Link>
        <div className="flex gap-1">
          {radicalNumber > 1 && (
            <Link
              href={`/radicals/${radicalNumber - 1}`}
              className="text-text-secondary hover:text-primary transition-colors no-underline text-xs px-2 py-1 border border-border rounded-lg"
            >
              &#8592; {radicalNumber - 1}
            </Link>
          )}
          {radicalNumber < 214 && (
            <Link
              href={`/radicals/${radicalNumber + 1}`}
              className="text-text-secondary hover:text-primary transition-colors no-underline text-xs px-2 py-1 border border-border rounded-lg"
            >
              {radicalNumber + 1} &#8594;
            </Link>
          )}
        </div>
      </div>

      {/* 부수 헤더 */}
      <div className="bg-surface px-5 pt-6 pb-5 text-center border-b border-border">
        <div className="font-[var(--font-hanja)] text-8xl font-bold leading-tight text-text">
          {radical.character.char}
        </div>

        {/* 음훈 */}
        <div className="mt-3">
          {radical.reading_hun && (
            <span className="text-lg text-text-secondary">{radical.reading_hun} </span>
          )}
          {radical.reading_eum && (
            <span className="text-2xl font-bold text-primary">{radical.reading_eum}</span>
          )}
        </div>

        {/* 메타 정보 */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          <span className="bg-primary-light text-primary px-2.5 py-0.5 rounded-xl text-xs font-medium">
            #{radical.radical_number}
          </span>
          {radical.character.strokes && (
            <span className="bg-primary-light text-primary px-2.5 py-0.5 rounded-xl text-xs font-medium">
              {radical.character.strokes}획
            </span>
          )}
          {radical.lesson && (
            <span className="bg-extend-bg text-extend px-2.5 py-0.5 rounded-xl text-xs font-medium">
              {radical.lesson.title} &middot; {radical.lesson.theme}
            </span>
          )}
        </div>

        {/* 변형자 */}
        {hasVariants && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs text-text-secondary">변형:</span>
            {radical.variants.map((v) => (
              <span
                key={v}
                className="font-[var(--font-hanja)] text-xl bg-surface border border-border rounded-lg px-2 py-0.5"
              >
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 字形變化 차트 */}
      <section className="px-5 pt-5 pb-2">
        <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2 mb-3">
          字形變化
        </h2>
        <div className="bg-surface border border-border rounded-xl p-3 overflow-x-auto">
          <Image
            src={`/glyphs/chart_${String(radical.radical_number).padStart(3, "0")}.png`}
            alt={`${radical.character.char} 字形變化 (갑골문·금문·소전)`}
            width={535}
            height={133}
            className="w-full h-auto"
            priority
          />
        </div>
      </section>

      {/* 字形 解說 */}
      {radical.explanation && (
        <section className="px-5 py-4">
          <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2 mb-3">
            字形 解說
          </h2>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-[15px] leading-relaxed text-text">
              {renderExplanation(radical.explanation)}
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
              {radical.shuowen_chinese && (
                <div>
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    原文
                  </div>
                  <p className="font-[var(--font-hanja)] text-base leading-relaxed text-text">
                    {radical.shuowen_chinese}
                  </p>
                </div>
              )}
              {radical.shuowen_korean && (
                <div>
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    번역
                  </div>
                  <p className="text-[15px] leading-relaxed text-text">
                    {radical.shuowen_korean}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 관련 한자 */}
      <section className="px-5 pb-5">
        <h2 className="text-sm font-bold text-primary border-l-3 border-primary pl-2 mb-3">
          관련 한자
          {relatedChars.length > 0 && (
            <span className="text-text-secondary font-normal ml-2">
              {relatedChars.length}자
            </span>
          )}
        </h2>

        {/* 부수 자체 */}
        <Link
          href={`/hanja/${encodeURIComponent(radical.character.char)}`}
          className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3
            no-underline text-text transition-all duration-200 hover:border-primary mb-3"
        >
          <span className="font-[var(--font-hanja)] text-2xl font-bold">
            {radical.character.char}
          </span>
          <div className="text-sm">
            <span className="font-semibold">{radical.reading_eum}</span>
            {radical.reading_hun && (
              <span className="text-text-secondary ml-1">{radical.reading_hun}</span>
            )}
            <span className="text-xs text-primary ml-2">부수</span>
          </div>
        </Link>

        {/* 하위 한자 그리드 */}
        {relatedChars.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {relatedChars.map((rc) => {
              const charImgSrc = getCharImageSrc(rc.char);
              return (
                <Link
                  key={rc.id}
                  href={`/hanja/${encodeURIComponent(rc.char)}`}
                  className="flex flex-col items-center bg-surface border border-border rounded-xl py-3 px-2
                    no-underline text-text transition-all duration-200 hover:border-primary hover:shadow-sm"
                >
                  {charImgSrc ? (
                    /* eslint-disable @next/next/no-img-element */
                    <img
                      src={charImgSrc}
                      alt={rc.reading}
                      className="h-9 w-auto"
                    />
                  ) : (
                    <span className="font-[var(--font-hanja)] text-3xl font-bold leading-tight">
                      {rc.char}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-primary mt-1">
                    {rc.reading}
                  </span>
                  {rc.unihan_def && (
                    <span className="text-[11px] text-text-secondary mt-0.5 text-center line-clamp-1">
                      {rc.unihan_def}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="h-20" />
    </>
  );
}
