"use client";

import { useCallback, useEffect, useState } from "react";
import type { ViewerDto } from "@/lib/users/dto";

type ViewerState = {
  error: string | null;
  loading: boolean;
  user: ViewerDto | null;
  refresh: () => Promise<void>;
};

export function useViewer(): ViewerState {
  const [user, setUser] = useState<ViewerDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users/me", { cache: "no-store" });

      if (response.status === 401) {
        setUser(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const payload = (await response.json()) as { user: ViewerDto };
      setUser(payload.user);
    } catch {
      setUser(null);
      setError("Account data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    error,
    loading,
    user,
    refresh
  };
}
