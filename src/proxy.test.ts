import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("public installation resources", () => {
  it.each(["/manifest.webmanifest", "/offline.html", "/login"])("allows logged-out access to %s", (path) => {
    expect(proxy(new NextRequest(`https://blomoon.ir${path}`)).headers.get("location")).toBeNull();
  });
  it("still protects the globe", () => {
    expect(proxy(new NextRequest("https://blomoon.ir/")).headers.get("location")).toBe("https://blomoon.ir/login?next=%2F");
  });
});
