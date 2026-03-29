import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";

export function useUrlFilters(defaults: Record<string, string> = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const get = useCallback(
    (key: string) => searchParams.get(key) || defaults[key] || "",
    [searchParams, defaults]
  );

  const set = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== (defaults[key] || "")) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams, defaults]
  );

  const setMultiple = useCallback(
    (updates: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value && value !== (defaults[key] || "")) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams, defaults]
  );

  return { get, set, setMultiple };
}
