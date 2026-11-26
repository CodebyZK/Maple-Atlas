import { useState } from "react";
import type { KeyboardEvent } from "react";
import { CANADA_VIEWBOX, PROVINCE_SHAPES } from "./canadaGeometry";
import type { FundingTotal, RegionTotal } from "./types";

const compactCurrency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1
});

/** Sequential single-hue ramp: level 0 is "no data", 1-5 light to dark. */
export const LEVEL_COLORS = [
  "#dfe3de",
  "#c5d9d0",
  "#8db7a5",
  "#518d77",
  "#28634f",
  "#123f33"
];

export function colorLevel(value: number, maximum: number): number {
  if (value <= 0 || maximum <= 0) return 0;
  const ratio = value / maximum;
  if (ratio <= 0.1) return 1;
  if (ratio <= 0.25) return 2;
  if (ratio <= 0.5) return 3;
  if (ratio <= 0.75) return 4;
  return 5;
}

interface CanadaMapProps {
  regions: RegionTotal[];
  unknown: FundingTotal;
  isSample: boolean;
  selectedRegion: string;
  onSelect: (code: string) => void;
}

function plural(count: number): string {
  return `${count.toLocaleString("en-CA")} published agreement${count === 1 ? "" : "s"}`;
}

/**
 * A choropleth of provinces and territories: one fill per region by total
 * funding, hover or focus to inspect, click or Enter to filter.
 */
export default function CanadaMap({
  regions,
  unknown,
  isSample,
  selectedRegion,
  onSelect
}: CanadaMapProps) {
  const [focusedRegion, setFocusedRegion] = useState("");
  const byCode = new Map(regions.map((region) => [region.code, region]));
  const maximum = Math.max(...regions.map((region) => region.value), 0);
  const active = byCode.get(focusedRegion || selectedRegion);

  function toggle(code: string) {
    onSelect(code === selectedRegion ? "" : code);
  }

  function handleKeyDown(event: KeyboardEvent<SVGPathElement>, code: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(code);
    }
  }

  // Draw the selected region last so its outline sits on top of neighbours.
  const shapes = [...PROVINCE_SHAPES].sort(
    (a, b) => Number(a.code === selectedRegion) - Number(b.code === selectedRegion)
  );

  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Across Canada</p>
          <h2>Funding map</h2>
        </div>
        <span>Hover a province or territory, or select one to filter</span>
      </div>

      <div className="map-layout">
        <div className="map-canvas">
          <svg
            className="province-map"
            viewBox={CANADA_VIEWBOX}
            role="group"
            aria-label="Federal funding by province and territory"
          >
            {shapes.map((shape) => {
              const region = byCode.get(shape.code);
              const value = region?.value ?? 0;
              const level = colorLevel(value, maximum);
              const selected = shape.code === selectedRegion;
              const label = `${shape.name}: ${
                value > 0 ? compactCurrency.format(value) : "no data"
              }, ${plural(region?.count ?? 0)}`;
              return (
                <path
                  key={shape.code}
                  d={shape.d}
                  className={`province-shape${selected ? " selected" : ""}${
                    shape.code === focusedRegion ? " focused" : ""
                  }`}
                  fill={LEVEL_COLORS[level]}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => toggle(shape.code)}
                  onKeyDown={(event) => handleKeyDown(event, shape.code)}
                  onPointerEnter={() => setFocusedRegion(shape.code)}
                  onPointerLeave={() => setFocusedRegion("")}
                  onFocus={() => setFocusedRegion(shape.code)}
                  onBlur={() => setFocusedRegion("")}
                >
                  <title>{label}</title>
                </path>
              );
            })}
          </svg>
        </div>

        <aside className="map-summary" aria-live="polite">
          {active ? (
            <>
              <span>{active.code}</span>
              <h3>{active.name}</h3>
              <strong>{active.value > 0 ? compactCurrency.format(active.value) : "No data"}</strong>
              <p>{plural(active.count)}</p>
              {selectedRegion && (
                <button type="button" onClick={() => onSelect("")}>
                  Show all regions
                </button>
              )}
            </>
          ) : (
            <>
              <span>Map</span>
              <h3>Explore the regions</h3>
              <p>
                {isSample
                  ? "Shading shows funding in the development sample."
                  : "Darker regions received more federal funding for the current filters."}
              </p>
            </>
          )}
        </aside>
      </div>

      <div className="region-selector" aria-label="Funding value by province and territory">
        {regions.map((region) => {
          const selected = region.code === selectedRegion;
          return (
            <button
              type="button"
              key={region.code}
              className={`region-chip level-${colorLevel(region.value, maximum)}${selected ? " selected" : ""}`}
              aria-pressed={selected}
              onClick={() => toggle(region.code)}
              onPointerEnter={() => setFocusedRegion(region.code)}
              onPointerLeave={() => setFocusedRegion("")}
            >
              <strong>{region.code}</strong>
              <span>{region.value > 0 ? compactCurrency.format(region.value) : "No data"}</span>
            </button>
          );
        })}
      </div>

      <div className="map-footer">
        <div className="legend" aria-label="Funding value legend">
          <span>No data</span>
          <i className="level-0" />
          <span>Lower</span>
          {[1, 2, 3, 4, 5].map((level) => (
            <i className={`level-${level}`} key={level} />
          ))}
          <span>Higher</span>
        </div>
        <p>
          {unknown.count > 0
            ? `${compactCurrency.format(unknown.value)} in ${plural(unknown.count)} has no recognized province or territory.`
            : "Every agreement has a recognized province or territory."}
        </p>
      </div>
    </section>
  );
}
