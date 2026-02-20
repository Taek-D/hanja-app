"use client";

import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFavorites } from "@/hooks/useFavorites";

export default function ProfilePage() {
  const [streak] = useLocalStorage("hanja-streak", 0);
  const [recentChars] = useLocalStorage<string[]>("hanja-recent", []);
  const [prefs] = useLocalStorage<{ goal?: string; studyMinutes?: number; onboarded?: boolean }>("hanja-prefs", {});
  const { favorites } = useFavorites();
  const [reviewQueue] = useLocalStorage<{ char: string; correctCount: number }[]>("hanja-review-queue", []);

  const mastered = reviewQueue.filter((r) => r.correctCount >= 3).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-primary text-white px-5 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="text-white/70 hover:text-white transition-colors no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">내 프로필</h1>
        </div>

        <div className="flex justify-between">
          <div className="text-center">
            <div className="text-3xl font-bold">{streak}</div>
            <div className="text-xs text-white/70 mt-1">연속 학습일</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{recentChars.length}</div>
            <div className="text-xs text-white/70 mt-1">학습한 한자</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{mastered}</div>
            <div className="text-xs text-white/70 mt-1">마스터</div>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Learning settings */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">학습 설정</h2>
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">학습 목표</span>
              <span className="text-sm font-medium">
                {prefs.goal === "culture" ? "교양 한문" : prefs.goal === "grade" ? "급수 보조" : "미설정"}
              </span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between items-center">
              <span className="text-sm">하루 학습 시간</span>
              <span className="text-sm font-medium">
                {prefs.studyMinutes ? `${prefs.studyMinutes}분` : "미설정"}
              </span>
            </div>
            <div className="border-t border-border" />
            <Link
              href="/onboarding"
              className="block text-sm text-primary font-medium no-underline"
            >
              설정 변경 &rarr;
            </Link>
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">바로가기</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/mission/today"
              className="flex flex-col items-center gap-2 bg-surface border border-border rounded-xl
                px-4 py-4 no-underline text-text transition-all duration-200 hover:border-primary"
            >
              <span className="text-2xl">&#127919;</span>
              <span className="text-sm font-medium">오늘의 미션</span>
            </Link>
            <Link
              href="/review"
              className="flex flex-col items-center gap-2 bg-surface border border-border rounded-xl
                px-4 py-4 no-underline text-text transition-all duration-200 hover:border-primary"
            >
              <span className="text-2xl">&#128218;</span>
              <span className="text-sm font-medium">복습하기</span>
            </Link>
            <Link
              href="/search"
              className="flex flex-col items-center gap-2 bg-surface border border-border rounded-xl
                px-4 py-4 no-underline text-text transition-all duration-200 hover:border-primary"
            >
              <span className="text-2xl">&#128269;</span>
              <span className="text-sm font-medium">한자 검색</span>
            </Link>
            <Link
              href="/"
              className="flex flex-col items-center gap-2 bg-surface border border-border rounded-xl
                px-4 py-4 no-underline text-text transition-all duration-200 hover:border-primary"
            >
              <span className="text-2xl">&#127968;</span>
              <span className="text-sm font-medium">홈</span>
            </Link>
          </div>
        </section>

        {/* Favorites list */}
        {favorites.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-secondary mb-3">
              즐겨찾기 ({favorites.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {favorites.map((c) => (
                <Link
                  key={c}
                  href={`/hanja/${encodeURIComponent(c)}`}
                  className="w-12 h-12 bg-primary-light border border-primary/30 rounded-xl
                    flex items-center justify-center font-[var(--font-hanja)] text-xl font-bold
                    no-underline text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  {c}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
