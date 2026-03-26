'use client';

import { useState, useEffect } from 'react';

/**
 * React 19 対応の fetch hook
 * AbortController でクリーンアップ
 * useEffect 内で synchronous setState を呼ばない設計
 */
export function useFetch<T>(url: string | null) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: !!url, error: null });
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setState({ data: json as T, loading: false, error: null });
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setState({ data: null, loading: false, error: err.message });
        }
      });

    return () => {
      controller.abort();
    };
  }, [url, fetchCount]);

  const refetch = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setFetchCount((c) => c + 1);
  };

  return { ...state, refetch };
}
