import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { radioMode } from "@/lib/modes/radio/mode";
import { ShellControlRail } from "./ShellControlRail";

describe("shell mode controls", () => {
  it("exposes one mode dialog trigger and leaves globe controls to the drawer", () => {
    const html = renderToStaticMarkup(createElement(ShellControlRail, {
      activeMode: radioMode, activeView: "main", modeSwitcherOpen: false,
      onOpenFavourites() {}, onOpenHistory() {}, onOpenModeSwitcher() {},
    }));
    expect(html).toContain('aria-label="Change mode"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('title="Globe spin"');
    expect(html.match(/<button/g)).toHaveLength(3);
  });
});
