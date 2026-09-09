import { describe, expect, it } from "vitest";
import type { TerraPointDetail } from "../types";
import { radioMode } from "./mode";

describe("radio mode presentation", () => {
  it("keeps radio-specific list copy on the mode", () => {
    expect(radioMode.copy.itemSingular).toBe("station");
    expect(radioMode.copy.listSubtitle).toBe("Radio stations by geography");
    expect(radioMode.copy.randomPlaybackError).toContain("random station");
  });

  it("formats station detail sections without leaking unknown fields", () => {
    const sections = radioMode.formatDetailSections({
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      fields: [
        { label: "Country", value: "France" },
        { label: "Language", value: "French" },
        { label: "Codec", value: "MP3" },
        { label: "Bitrate", value: "128 kbps" },
        { label: "Votes", value: "42" },
        { label: "Tags", value: "Untagged" }
      ],
      latitude: 48.8566,
      longitude: 2.3522,
      metrics: {
        Listeners: null
      },
      modeId: "radio",
      name: "Paris Radio",
      summary: "France"
    } satisfies TerraPointDetail);

    expect(sections.map((section) => section.title)).toEqual(["Station", "Stream", "Activity", "Location"]);
    expect(sections.flatMap((section) => section.fields.map((field) => field.label))).not.toContain("Tags");
    expect(sections.flatMap((section) => section.fields)).toContainEqual({ label: "Codec", value: "MP3" });
  });

  it("returns a loading detail section for pending detail fetches", () => {
    expect(radioMode.formatDetailSections(null)).toEqual([
      {
        title: "Station",
        fields: [
          { label: "Listeners", value: "Loading" },
          { label: "Time", value: "Loading" }
        ]
      }
    ]);
  });
});
