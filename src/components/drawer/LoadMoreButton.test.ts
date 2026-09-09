import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoadMoreButton } from "./LoadMoreButton";

describe("LoadMoreButton", () => {
  it("keeps its label while pagination is exhausted", () => {
    const markup = renderToStaticMarkup(createElement(LoadMoreButton, {
      className: "directory-load-more",
      disabled: true,
      isLoading: false,
      onLoadMore: vi.fn()
    }));

    expect(markup).toContain("Show 50 more");
    expect(markup).toContain("disabled");
  });

  it("disables without replacing its label while loading", () => {
    const markup = renderToStaticMarkup(createElement(LoadMoreButton, {
      className: "directory-load-more",
      isLoading: true,
      onLoadMore: vi.fn()
    }));

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Show 50 more");
    expect(markup).toContain("disabled");
  });
});
