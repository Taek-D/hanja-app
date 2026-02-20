"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAllRadicals, getLessons } from "@/lib/queries";
import type { RadicalWithCharacter, Lesson } from "@/types/hanja";

function RadicalsContent() {
  const searchParams = useSearchParams();
  const initialLesson = parseInt(searchParams.get("lesson") || "0", 10);

  const [radicals, setRadicals] = useState<RadicalWithCharacter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<number>(initialLesson);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [allRadicals, allLessons] = await Promise.all([
          getAllRadicals(),
          getLessons(),
        ]);
        if (cancelled) return;
        setRadicals(allRadicals);
        setLessons(allLessons);
      } catch {
        if (cancelled) return;
        setRadicals([]);
        setLessons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = selectedLesson === 0
    ? radicals
    : radicals.filter((r) => r.lesson?.number === selectedLesson);

  return (
    <>
      {/* 헤더 */}
      <div className="bg-primary text-white px-5 pt-10 pb-6">
        <h1 className="text-xl font-bold mb-1">214 부수</h1>
        <p className="text-sm text-white/70">
          한자의 기본 구성요소, 214개 부수를 탐색하세요
        </p>
      </div>

      {/* 과(課) 탭 */}
      <div className="sticky top-0 z-10 bg-bg border-b border-border">
        <div className="flex overflow-x-auto px-3 py-2 gap-1.5 no-scrollbar">
          <button
            onClick={() => setSelectedLesson(0)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${selectedLesson === 0
                ? "bg-primary text-white border-primary"
                : "bg-surface text-text-secondary border-border hover:border-primary"
              }`}
          >
            전체 ({radicals.length})
          </button>
          {lessons.map((l) => {
            const count = radicals.filter((r) => r.lesson?.number === l.number).length;
            return (
              <button
                key={l.number}
                onClick={() => setSelectedLesson(l.number)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                  ${selectedLesson === l.number
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text-secondary border-border hover:border-primary"
                  }`}
              >
                {l.number}과 {l.theme} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 로딩 */}
      {loading ? (
        <div className="px-5 py-12 text-center text-text-secondary text-sm">
          부수 데이터를 불러오는 중...
        </div>
      ) : (
        <>
          {/* 선택된 과 정보 */}
          {selectedLesson > 0 && (
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-base font-bold text-text">
                {lessons.find((l) => l.number === selectedLesson)?.title}
              </h2>
              <p className="text-sm text-text-secondary">
                {lessons.find((l) => l.number === selectedLesson)?.theme}
              </p>
            </div>
          )}

          {/* 부수 그리드 */}
          <div className="grid grid-cols-4 gap-2 px-4 py-4">
            {filtered.map((r) => (
              <Link
                key={r.radical_number}
                href={`/radicals/${r.radical_number}`}
                className="flex flex-col items-center bg-surface border border-border rounded-xl
                  py-3 px-1 no-underline text-text transition-all duration-200
                  hover:border-primary hover:shadow-sm hover:-translate-y-0.5"
              >
                <span className="font-[var(--font-hanja)] text-3xl font-bold leading-tight">
                  {r.character.char}
                </span>
                <span className="text-xs text-primary font-semibold mt-1">
                  {r.reading_eum || ""}
                </span>
                <span className="text-[10px] text-text-secondary mt-0.5 truncate max-w-full px-1">
                  {r.reading_hun || ""}
                </span>
                <span className="text-[10px] text-text-secondary/60 mt-0.5">
                  #{r.radical_number}
                </span>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-text-secondary text-sm">
              해당 과에 부수가 없습니다.
            </div>
          )}
        </>
      )}

      <div className="h-20" />
    </>
  );
}

export default function RadicalsPage() {
  return (
    <Suspense fallback={
      <div className="px-5 py-12 text-center text-text-secondary text-sm">
        부수 데이터를 불러오는 중...
      </div>
    }>
      <RadicalsContent />
    </Suspense>
  );
}
