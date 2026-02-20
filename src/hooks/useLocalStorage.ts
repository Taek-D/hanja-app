"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialValueRef = useRef(initialValue);
  const cachedRef = useRef<T>(initialValue);
  const cachedJsonRef = useRef<string | null>(null);

  const readValue = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValueRef.current;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === cachedJsonRef.current) {
        return cachedRef.current;
      }
      if (item === null) {
        cachedJsonRef.current = null;
        cachedRef.current = initialValueRef.current;
        return cachedRef.current;
      }
      cachedJsonRef.current = item;
      cachedRef.current = JSON.parse(item) as T;
      return cachedRef.current;
    } catch {
      return initialValueRef.current;
    }
  }, [key]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const onStorage = (event: Event) => {
        if (event instanceof StorageEvent && event.key !== null && event.key !== key) {
          return;
        }
        onStoreChange();
      };

      window.addEventListener("storage", onStorage);
      window.addEventListener("local-storage", onStorage);

      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("local-storage", onStorage);
      };
    },
    [key]
  );

  const storedValue = useSyncExternalStore(subscribe, readValue, () => initialValueRef.current);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === "undefined") return;

      const prev = readValue();
      const next = value instanceof Function ? value(prev) : value;

      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event("local-storage"));
      } catch {
        // 무시
      }
    },
    [key, readValue]
  );

  return [storedValue, setValue, true] as const;
}
