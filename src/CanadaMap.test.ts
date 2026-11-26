import { describe, expect, it } from "vitest";
import { popupContent, textElement } from "./CanadaMap";

const hostile = '<img src=x onerror="alert(1)">Toronto';

describe("map popup content", () => {
  it("renders data text as text, never as HTML", () => {
    const popup = popupContent(hostile, 1500, 2, true);

    expect(popup.querySelector("img")).toBeNull();
    expect(popup.querySelector("strong")?.textContent).toBe(hostile);
    expect(popup.textContent).toContain("2 agreements");
    expect(popup.textContent).toContain("Approximate location");
  });

  it("builds tooltips as text nodes", () => {
    const tooltip = textElement(hostile);

    expect(tooltip.querySelector("img")).toBeNull();
    expect(tooltip.textContent).toBe(hostile);
  });
});
