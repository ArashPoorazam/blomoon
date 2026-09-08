import { expect, it } from "vitest";
import { getDrawerPointSource, getListContextEntry } from "./usePointSources";
import type { ShellDrawerStack } from "./shell/drawerState";

it("retains the exact folder context underneath station details", () => {
  const stack: ShellDrawerStack = [{ kind: "main" }, { kind: "favourites" },
    { kind: "favourite-folder", folderId: "folder" }, { kind: "point-detail", modeId: "radio", pointId: "station" }];
  expect(getDrawerPointSource(stack)).toBe("favourites");
  expect(getListContextEntry(stack)).toEqual({ kind: "favourite-folder", folderId: "folder" });
  expect(getDrawerPointSource([{ kind: "main" }, { kind: "account" }])).toBeNull();
  expect(getDrawerPointSource([{ kind: "main" }, { kind: "history" }])).toBe("history");
  expect(getDrawerPointSource([{ kind: "main" }])).toBe("list");
});
