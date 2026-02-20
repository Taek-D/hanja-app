"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import Toast from "@/components/Toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFavorites } from "@/hooks/useFavorites";
import { getLessons, getAllRadicals } from "@/lib/queries";
import { getCharImageSrc } from "@/lib/imageChar";
import type { Lesson, RadicalWithCharacter } from "@/types/hanja";

export default function HomePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [radicals, setRadicals] = useState<RadicalWithCharacter[]>([]);
  const [recentChars, , recentLoaded] = useLocalStorage<string[]>("hanja-recent", []);
  const { favorites } = useFavorites();
  const [loading, setLoading] = useState(true);
  const [todayBucket, setTodayBucket] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [l, r] = await Promise.all([getLessons(), getAllRadicals()]);
        if (cancelled) return;
        setLessons(l);
        setRadicals(r);
      } catch {
        if (cancelled) return;
        setLessons([]);
        setRadicals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTodayBucket(Math.floor(Date.now() / 86400000));
  }, []);

  // 오늘의 부수: 날짜 기반으로 고정 (매일 달라짐)
  const todayIndex = radicals.length > 0
    ? todayBucket % radicals.length
    : 0;
  const todayRadical = radicals[todayIndex];

  return (
    <>
      <Toast />

      {/* 헤더 */}
      <div className="bg-primary bg-gradient-to-br from-primary to-primary-dark text-white px-6 pt-12 pb-10 shadow-lg shadow-primary/20 rounded-b-3xl relative z-10">
        <h1 className="text-2xl font-bold mb-1 tracking-tight">214부수 학습</h1>
        <p className="text-sm text-white/80 font-medium">한자의 뿌리, 214개 부수를 이해하세요</p>
        <div className="mt-6">
          <SearchBar />
        </div>
      </div>

      <div className="px-5 py-8 space-y-10">
        {/* 오늘의 부수 */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[15px] font-bold text-text tracking-tight">오늘의 부수</h2>
          </div>
          {loading ? (
            <div className="bg-surface border border-border/60 rounded-2xl p-8 text-center animate-pulse shadow-sm">
              <div className="font-[var(--font-hanja)] text-5xl text-text/10 mb-2">部</div>
              <div className="text-sm text-text-secondary">불러오는 중...</div>
            </div>
          ) : todayRadical ? (
            <Link
              href={`/radicals/${todayRadical.radical_number}`}
              className="group block bg-surface border border-border/60 rounded-2xl p-7 text-center
                no-underline text-text transition-all duration-300
                hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              <div className="font-[var(--font-hanja)] text-[72px] font-bold mb-3 text-text group-hover:text-primary transition-colors duration-300">
                {todayRadical.character.char}
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-1.5">
                {todayRadical.reading_hun && (
                  <span className="text-lg text-text-secondary font-medium">{todayRadical.reading_hun}</span>
                )}
                <span className="text-2xl font-bold text-primary">
                  {todayRadical.reading_eum || ""}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-bg rounded-lg text-[11px] text-text-secondary font-medium mt-4">
                <span className="opacity-70">#{todayRadical.radical_number}</span>
                <span className="w-1 h-1 bg-border rounded-full"></span>
                <span>{todayRadical.lesson?.title || ""}</span>
              </div>
              {todayRadical.explanation && (
                <p className="text-[13px] text-text-secondary mt-4 leading-relaxed line-clamp-2 px-2">
                  {todayRadical.explanation.replace(/\{\{glyph:[^}]+\}\}/g, "")}
                </p>
              )}
            </Link>
          ) : (
            <div className="bg-surface border border-border/60 rounded-2xl p-6 text-center text-text-secondary text-sm">
              오늘의 부수를 불러올 수 없습니다.
            </div>
          )}
        </section>

        {/* 빠른 탐색 */}
        <section>
          <h2 className="text-[15px] font-bold text-text tracking-tight mb-4">빠른 탐색</h2>
          <div className="grid grid-cols-2 gap-3.5">
            <Link
              href="/radicals"
              className="flex items-center gap-3.5 bg-surface border border-border/60 rounded-2xl px-5 py-4
                no-underline text-text transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 group"
            >
              <span className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity">&#x2F00;</span>
              <span className="text-[14px] font-semibold">214 부수</span>
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-3.5 bg-surface border border-border/60 rounded-2xl px-5 py-4
                no-underline text-text transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 group"
            >
              <span className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity">&#128269;</span>
              <span className="text-[14px] font-semibold">한자 검색</span>
            </Link>
          </div>
        </section>

        {/* 13과 과별 탐색 */}
        {!loading && lessons.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-text tracking-tight">과별 학습</h2>
              <Link href="/radicals" className="text-[13px] text-primary no-underline font-semibold hover:opacity-80 transition-opacity">
                전체 보기
              </Link>
            </div>
            <div className="space-y-3">
              {lessons.map((l) => {
                const lessonRadicals = radicals.filter((r) => r.lesson?.number === l.number);
                const preview = lessonRadicals.slice(0, 6);
                return (
                  <Link
                    key={l.number}
                    href={`/radicals?lesson=${l.number}`}
                    className="block bg-surface border border-border/60 rounded-2xl px-5 py-4
                      no-underline text-text transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-[14px] group-hover:text-primary transition-colors">
                          {l.title}
                        </span>
                        <span className="text-[12px] text-text-secondary ml-2 font-medium bg-bg px-2 py-0.5 rounded-md">
                          {l.theme}
                        </span>
                      </div>
                      <span className="text-[12px] font-semibold text-text-secondary bg-bg px-2 py-0.5 rounded-md">
                        {lessonRadicals.length}자
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {preview.map((r) => (
                        <span
                          key={r.radical_number}
                          className="font-[var(--font-hanja)] text-[22px] text-text/80 group-hover:text-text transition-colors"
                        >
                          {r.character.char}
                        </span>
                      ))}
                      {lessonRadicals.length > 6 && (
                        <span className="text-[11px] font-bold text-text-secondary/70 ml-1">
                          +{lessonRadicals.length - 6}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 최근 본 한자 */}
        {recentLoaded && recentChars.length > 0 && (
          <section>
            <h2 className="text-[15px] font-bold text-text tracking-tight mb-4">최근 본 한자</h2>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {recentChars.slice(0, 10).map((c) => {
                const imgSrc = getCharImageSrc(c);
                return (
                  <Link
                    key={c}
                    href={`/hanja/${encodeURIComponent(c)}`}
                    className="snap-start shrink-0 w-16 h-16 bg-surface border border-border/60 rounded-2xl
                      flex items-center justify-center
                      no-underline text-text transition-all duration-300 shadow-sm
                      hover:border-primary/40 hover:bg-primary-light/30 hover:shadow-md hover:-translate-y-1"
                  >
                    {imgSrc ? (
                      /* eslint-disable @next/next/no-img-element */
                      <img src={imgSrc} alt="" className="h-9 w-auto" />
                    ) : (
                      <span className="font-[var(--font-hanja)] text-3xl font-bold">{c}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 즐겨찾기 */}
        {favorites.length > 0 && (
          <section>
            <h2 className="text-[15px] font-bold text-text tracking-tight mb-4 flex items-center gap-2">
              즐겨찾기
              <span className="text-[12px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {favorites.length}
              </span>
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {favorites.map((c) => {
                const imgSrc = getCharImageSrc(c);
                return (
                  <Link
                    key={c}
                    href={`/hanja/${encodeURIComponent(c)}`}
                    className="snap-start shrink-0 w-16 h-16 bg-gradient-to-br from-primary-light to-blue-50 border border-primary/20 rounded-2xl
                      flex items-center justify-center
                      no-underline text-primary transition-all duration-300 shadow-sm
                      hover:border-primary/50 hover:bg-primary hover:text-white hover:shadow-md hover:-translate-y-1"
                  >
                    {imgSrc ? (
                      /* eslint-disable @next/next/no-img-element */
                      <img src={imgSrc} alt="" className="h-9 w-auto" />
                    ) : (
                      <span className="font-[var(--font-hanja)] text-3xl font-bold">{c}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="h-4" />
    </>
  );
}
