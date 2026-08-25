import { describe, expect, it } from "vitest";
import { isRadioStationId } from "./api";
import { isSafeStreamUrl } from "./normalize";

describe("radio boundary validation", () => {
  it("accepts Radio Browser UUID station ids", () => {
    expect(isRadioStationId("8bdb6947-f995-46c5-8266-c3c94f93fcd9")).toBe(true);
  });

  it("rejects non-UUID station ids before persistence", () => {
    expect(isRadioStationId("../../../etc/passwd")).toBe(false);
    expect(isRadioStationId("not-a-station")).toBe(false);
  });

  it("allows only http and https stream URLs", () => {
    expect(isSafeStreamUrl("https://example.com/live.mp3")).toBe(true);
    expect(isSafeStreamUrl("http://example.com/live.mp3")).toBe(true);
    expect(isSafeStreamUrl("file:///tmp/live.mp3")).toBe(false);
    expect(isSafeStreamUrl("javascript:alert(1)")).toBe(false);
  });
});
