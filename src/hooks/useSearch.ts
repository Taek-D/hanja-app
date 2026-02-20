"use client";

import { useState, useEffect, useRef } from "react";
import { searchCharacters } from "@/lib/queries";
import type { Character } from "@/types/hanja";

export function useSearch(query: string, debounceMs = 300) {
  const trimmedQuery = query.trim();
  const [results, setResults] = useState<(Character & { reading: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!trimmedQuery) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchCharacters(trimmedQuery);
        if (requestIdRef.current === requestId) {
          setResults(data);
        }
      } catch {
        if (requestIdRef.current === requestId) {
          setResults([]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [trimmedQuery, debounceMs]);

  if (!trimmedQuery) {
    return { results: [], loading: false };
  }

  return { results, loading };
}
