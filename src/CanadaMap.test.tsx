import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROVINCE_SHAPES } from "./canadaGeometry";
import CanadaMap, { colorLevel, LEVEL_COLORS } from "./CanadaMap";
import type { RegionTotal } from "./types";

afterEach(cleanup);

const regions: RegionTotal[] = [
  { code: "ON", name: "Ontario", value: 1_000_000, count: 10 },
  { code: "YT", name: "Yukon", value: 50_000, count: 1 },
  { code: "PE", name: "Prince Edward Island", value: 0, count: 0 }
];

function renderMap(selectedRegion = "", onSelect = vi.fn()) {
  render(
    <CanadaMap
      regions={regions}
      unknown={{ name: "Unknown location", value: 2_000, count: 3 }}
      isSample={false}
      selectedRegion={selectedRegion}
      onSelect={onSelect}
    />
  );
  return onSelect;
}

describe("CanadaMap", () => {
  it("has a shape for all 13 provinces and territories", () => {
    expect(PROVINCE_SHAPES.map((shape) => shape.code).sort()).toEqual(
      ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]
    );
    expect(PROVINCE_SHAPES.every((shape) => shape.d.startsWith("M"))).toBe(true);
  });

  it("shades regions by funding and marks missing data", () => {
    renderMap();

    const ontario = screen.getByRole("button", { name: /^Ontario: \$1(?:\.0)?M, 10 published agreements$/ });
    const yukon = screen.getByRole("button", { name: /^Yukon: / });
    const pei = screen.getByRole("button", { name: /^Prince Edward Island: no data/ });

    expect(ontario).toHaveAttribute("fill", LEVEL_COLORS[5]);
    expect(yukon).toHaveAttribute("fill", LEVEL_COLORS[1]);
    expect(pei).toHaveAttribute("fill", LEVEL_COLORS[0]);
    expect(screen.getByText(/has no recognized province or territory/)).toBeInTheDocument();
  });

  it("selects by click or keyboard and clears when selected again", () => {
    const onSelect = renderMap();
    const yukon = screen.getByRole("button", { name: /^Yukon: / });

    fireEvent.click(yukon);
    fireEvent.keyDown(yukon, { key: "Enter" });
    expect(onSelect).toHaveBeenNthCalledWith(1, "YT");
    expect(onSelect).toHaveBeenNthCalledWith(2, "YT");

    cleanup();
    const onSelectSelected = renderMap("YT");
    fireEvent.click(screen.getByRole("button", { name: /^Yukon: / }));
    expect(onSelectSelected).toHaveBeenCalledWith("");
  });

  it("shows the hovered region in the summary panel", () => {
    renderMap();

    fireEvent.pointerEnter(screen.getByRole("button", { name: /^Ontario: / }));

    expect(screen.getByRole("heading", { name: "Ontario" })).toBeInTheDocument();
    expect(screen.getByText("10 published agreements")).toBeInTheDocument();
  });

  it("uses five funding levels relative to the largest region", () => {
    expect([0, 5, 20, 40, 70, 100].map((value) => colorLevel(value, 100))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(colorLevel(10, 0)).toBe(0);
  });
});
