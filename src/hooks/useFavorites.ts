"use client";

import { useLocalStorage } from "./useLocalStorage";
import { useCallback } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>("hanja-favorites", []);

  const isFavorite = useCallback(
    (char: string) => favorites.includes(char),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (char: string) => {
      setFavorites((prev) =>
        prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char]
      );
    },
    [setFavorites]
  );

  return { favorites, isFavorite, toggleFavorite };
}
