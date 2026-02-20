"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSearch } from "@/hooks/useSearch";
import CharacterCard from "@/components/CharacterCard";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const { results, loading } = useSearch(query);

  return (
    <>
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/"
            className="text-text-secondary hover:text-primary transition-colors no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold">검색</h1>
        </div>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="한자 또는 한글 음 검색"
            autoFocus
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 pl-10
              text-sm font-[var(--font-ui)] text-text
              placeholder:text-text-secondary/50
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
              transition-all duration-200"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-4">
        {loading && (
          <div className="text-center text-text-secondary text-sm py-8">
            검색 중...
          </div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="text-center text-text-secondary text-sm py-8">
            <span className="text-4xl block mb-3">&#128270;</span>
            &quot;{query}&quot;에 대한 결과가 없습니다.
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="text-xs text-text-secondary mb-3">
              {results.length}개 결과
            </div>
            <div className="space-y-2">
              {results.map((c) => (
                <CharacterCard
                  key={c.id}
                  char={c.char}
                  reading={c.reading}
                  meaning={c.unihan_def}
                  size="md"
                />
              ))}
            </div>
          </>
        )}

        {!query.trim() && (
          <div className="text-center text-text-secondary text-sm py-8">
            <span className="text-4xl block mb-3">&#128269;</span>
            한자를 직접 입력하거나<br />한글 음으로 검색하세요.
          </div>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-5 text-center text-text-secondary">로딩 중...</div>}>
      <SearchContent />
    </Suspense>
  );
}
