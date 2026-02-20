"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialQuery?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
}

export default function SearchBar({ initialQuery = "", autoFocus = false, onSearch }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      if (onSearch) {
        onSearch(trimmed);
      } else {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [query, onSearch, router]
  );

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="한자 또는 한글 음 검색"
        className="w-full bg-surface/90 backdrop-blur-sm border border-border/80 rounded-2xl px-5 py-3.5 pl-12
          text-[15px] font-[var(--font-ui)] text-text font-medium shadow-sm
          placeholder:text-text-secondary/60 placeholder:font-normal
          focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10
          transition-all duration-300 hover:border-primary/40 hover:shadow-md"
      />
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/70 group-focus-within:text-primary transition-colors duration-300"
        width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </form>
  );
}
