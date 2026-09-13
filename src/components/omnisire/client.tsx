"use client";
import { useCallback, useEffect, useState } from "react";
export type Json<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/omnisire/${path}`, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}
export function useResource<T>(path: string | null, interval = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    if (!path) return;
    let active = true;
    const load = () => {
      void request<T>(path)
        .then((value) => {
          if (active) {
            setData(value);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    };
    setData(null);
    load();
    const timer = interval ? setInterval(load, interval) : null;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [path, revision, interval]);
  return { data, error, refresh };
}
export function useAction(refresh?: () => void) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function run(
    operation: () => Promise<unknown>,
    message = "Changes saved.",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      setNotice(message);
      refresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, notice, error, run };
}
export function Feedback({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <>
      {error && (
        <p className="om-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="om-notice" role="status">
          {notice}
        </p>
      )}
    </>
  );
}
export function Loading() {
  return (
    <div className="om-empty" role="status">
      Loading workspace…
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className="om-badge" data-state={value}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}
export function bytes(value: number | null | undefined) {
  if (value == null) return "Unavailable";
  const n = value / 1024 ** 3;
  return n >= 1 ? `${n.toFixed(1)} GB` : `${(value / 1024 ** 2).toFixed(1)} MB`;
}
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="om-pagination">
      <span>
        {total.toLocaleString()} results · Page {page}
      </span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <button
        disabled={page * pageSize >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
