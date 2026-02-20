"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getNextInterval } from "@/lib/srs";

interface ReviewItem {
  char: string;
  reading: string;
  meaning: string;
  characterId: string;
  correctCount: number;
  wrongCount: number;
}

function parseStoredJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function ReviewPage() {
  const [reviewQueue, setReviewQueue] = useLocalStorage<ReviewItem[]>("hanja-review-queue", []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [initialized, setInitialized] = useState(false);

  // 복습 대기열이 비어있으면 최근 본 한자로 초기화
  useEffect(() => {
    if (initialized) return;

    async function initQueue() {
      try {
        const stored = window.localStorage.getItem("hanja-review-queue");
        let queue = parseStoredJson<ReviewItem[]>(stored, []);

        if (queue.length === 0) {
          // localStorage에서 최근 본 한자 가져오기
          const recentStr = window.localStorage.getItem("hanja-recent");
          const recent = parseStoredJson<string[]>(recentStr, []);

          if (recent.length > 0) {
            const charsToReview = recent.slice(0, 5);
            const newQueue: ReviewItem[] = [];

            for (const char of charsToReview) {
              const { data: c } = await supabase
                .from("characters")
                .select("id, char, unihan_def")
                .eq("char", char)
                .maybeSingle();

              if (!c) continue;

              const { data: r } = await supabase
                .from("readings")
                .select("value")
                .eq("character_id", c.id)
                .eq("is_primary", true)
                .maybeSingle();

              newQueue.push({
                char: c.char,
                reading: r?.value || "",
                meaning: c.unihan_def || "",
                characterId: c.id,
                correctCount: 0,
                wrongCount: 0,
              });
            }

            if (newQueue.length > 0) {
              setReviewQueue(newQueue);
              queue = newQueue;
            }
          }
        }

        if (queue.length === 0) {
          setFinished(true);
        }
      } catch {
        setFinished(true);
      } finally {
        setInitialized(true);
      }
    }

    initQueue();
  }, [initialized, setReviewQueue]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      setStats((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));

      // 정답/오답 횟수 갱신
      setReviewQueue((queue) => {
        const updated = [...queue];
        if (updated[currentIndex]) {
          if (correct) {
            updated[currentIndex].correctCount++;
          } else {
            updated[currentIndex].wrongCount++;
          }
        }
        return updated;
      });

      // 다음 문제로 이동
      if (currentIndex < reviewQueue.length - 1) {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
      } else {
        setFinished(true);
      }
    },
    [currentIndex, reviewQueue.length, setReviewQueue]
  );

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary text-sm">복습 준비 중...</div>
      </div>
    );
  }

  if (finished || reviewQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <div className="text-6xl mb-4">&#127793;</div>
        <h1 className="text-xl font-bold mb-2">
          {reviewQueue.length === 0 ? "복습할 한자가 없습니다" : "복습 완료!"}
        </h1>
        {stats.correct + stats.wrong > 0 && (
          <div className="text-sm text-text-secondary mb-4">
            정답 {stats.correct} / 오답 {stats.wrong}
          </div>
        )}
        <p className="text-sm text-text-secondary mb-6">
          {reviewQueue.length === 0
            ? "한자 상세 페이지를 방문하면 자동으로 복습 목록에 추가됩니다."
            : "다음 복습까지 잘 기억해두세요!"}
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold no-underline"
          >
            홈으로
          </Link>
          <Link
            href="/mission/today"
            className="bg-surface border border-border px-6 py-2 rounded-full
              text-sm font-semibold no-underline text-text hover:border-primary transition-colors"
          >
            미션 도전
          </Link>
        </div>
      </div>
    );
  }

  const item = reviewQueue[currentIndex];
  const interval = getNextInterval(item.correctCount, item.wrongCount);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-text-secondary hover:text-primary transition-colors no-underline"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">복습</h1>
        <span className="text-xs text-text-secondary ml-auto">
          {currentIndex + 1} / {reviewQueue.length}
        </span>
      </div>

      {/* 진행률 */}
      <div className="px-5 pt-4">
        <div className="flex gap-1.5">
          {reviewQueue.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300
                ${i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary/50" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      {/* 카드 */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div
          className="w-full bg-surface border border-border rounded-2xl p-8 text-center
            shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md"
          onClick={() => setShowAnswer(true)}
        >
          <div className="font-[var(--font-hanja)] text-8xl font-bold mb-4">{item.char}</div>

          {!showAnswer ? (
            <div className="text-sm text-text-secondary">
              탭하여 음/뜻 확인
            </div>
          ) : (
            <div className="animate-[fadeIn_0.3s_ease]">
              <div className="text-2xl font-semibold text-primary mb-2">{item.reading}</div>
              <div className="text-sm text-text-secondary">{item.meaning}</div>
              <div className="text-xs text-text-secondary mt-3">
                다음 복습: {interval}일 후
              </div>
            </div>
          )}
        </div>

        {showAnswer && (
          <div className="flex gap-3 mt-8 animate-[fadeIn_0.3s_ease]">
            <button
              onClick={() => handleAnswer(false)}
              className="bg-red-50 border-2 border-red-300 text-red-600 px-8 py-3
                rounded-full text-sm font-semibold cursor-pointer
                transition-all duration-200 hover:bg-red-100"
            >
              모르겠어요
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="bg-green-50 border-2 border-green-300 text-green-600 px-8 py-3
                rounded-full text-sm font-semibold cursor-pointer
                transition-all duration-200 hover:bg-green-100"
            >
              알겠어요
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
