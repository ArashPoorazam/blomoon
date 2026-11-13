// @vitest-environment jsdom
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { AppClientConfig } from "@/lib/app-config/types";
import { ApplicationGate, type ApplicationState } from "./ApplicationGate";
const cleanup = vi.hoisted(() => vi.fn());
vi.mock("../BlomoonApp", () => ({ BlomoonApp: () => {
  useEffect(() => () => cleanup(), []);
  return createElement("div", null, "Active player");
} }));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); cleanup.mockClear(); });
it.each(["revoked", "disabled", "network failure"])("unmounts the media app on %s at the next access poll", async reason => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const initial: ApplicationState = { authenticated: true, maintenance: false, message: "", enabledModes: ["radio"], announcement: "", supportEmail: "support@example.test" };
  const fetchMock = vi.fn(async () => {
    if (reason === "network failure") throw new Error("offline");
    return Response.json({ ...initial, authenticated: reason !== "revoked", enabledModes: reason === "disabled" ? [] : ["radio"] });
  });
  vi.stubGlobal("fetch", fetchMock);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(ApplicationGate, { initial, appConfig: {} as AppClientConfig, initialDatasets: {} })));
    expect(container.textContent).toContain("Active player");
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(container.textContent).not.toContain("Active player");
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/application-state", { cache: "no-store" });
    if (reason === "revoked") expect(container.textContent).toContain("Please sign in");
  } finally { await act(async () => root.unmount()); }
  await vi.advanceTimersByTimeAsync(30000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
