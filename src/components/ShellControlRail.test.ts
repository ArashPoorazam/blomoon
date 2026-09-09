import { describe, expect, it } from "vitest";
import { radioMode } from "@/lib/modes/radio/mode";
import type { TerraMode } from "@/lib/modes/types";
import { getModeControlItems } from "./ShellControlRail";

describe("shell mode controls", () => {
  it("builds controls from registered modes", () => {
    const modes = [
      radioMode,
      {
        ...radioMode,
        controlIcon: "podcast",
        id: "podcasts",
        label: "Podcasts"
      }
    ] satisfies TerraMode[];

    expect(getModeControlItems(modes, "podcasts")).toEqual([
      {
        active: false,
        icon: "radio",
        id: "radio",
        label: "Radio"
      },
      {
        active: true,
        icon: "podcast",
        id: "podcasts",
        label: "Podcasts"
      }
    ]);
  });
});
