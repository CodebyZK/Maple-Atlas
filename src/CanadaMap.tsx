import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { FundingTotal, RegionTotal } from "./types";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1
});

const tilePositions: Record<string, { x: number; y: number }> = {
  YT: { x: 70, y: 38 },
  NT: { x: 190, y: 38 },
  NU: { x: 370, y: 38 },
  BC: { x: 70, y: 158 },
  AB: { x: 190, y: 158 },
  SK: { x: 310, y: 158 },
  MB: { x: 430, y: 158 },
  ON: { x: 490, y: 278 },
  QC: { x: 610, y: 218 },
  NB: { x: 730, y: 278 },
  PE: { x: 790, y: 218 },
  NS: { x: 850, y: 278 },
  NL: { x: 790, y: 98 }
};

interface CanadaMapProps {
  regions: RegionTotal[];
  unknown: FundingTotal;
  selectedRegion: string;
  onSelect: (code: string) => void;
}

function colorLevel(value: number, maximum: number): number {
  if (value <= 0) return 0;
  const ratio = value / maximum;
  if (ratio <= 0.1) return 1;
  if (ratio <= 0.25) return 2;
  if (ratio <= 0.5) return 3;
  if (ratio <= 0.75) return 4;
  return 5;
}

export default function CanadaMap({
  regions,
  unknown,
  selectedRegion,
  onSelect
}: CanadaMapProps) {
  const [focusedRegion, setFocusedRegion] = useState("");
  const maximum = Math.max(...regions.map((region) => region.value), 1);
  const active = regions.find(
    (region) => region.code === (focusedRegion || selectedRegion)
  );

  function handleKeyDown(event: KeyboardEvent<SVGGElement>, code: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(code);
    }
  }

  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Across Canada</p>
          <h2>Funding by region</h2>
        </div>
        <span>Select a region to filter</span>
      </div>

      <div className="map-layout">
        <svg
          className="canada-map"
          viewBox="0 0 970 390"
          role="group"
          aria-label="Canadian funding by province and territory"
        >
          {regions.map((region) => {
            const position = tilePositions[region.code];
            const selected = selectedRegion === region.code;
            return (
              <g
                className={`map-region level-${colorLevel(region.value, maximum)}${selected ? " selected" : ""}`}
                key={region.code}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${region.name}: ${currency.format(region.value)}, ${region.count} agreements`}
                transform={`translate(${position.x} ${position.y})`}
                onClick={() => onSelect(region.code)}
                onKeyDown={(event) => handleKeyDown(event, region.code)}
                onMouseEnter={() => setFocusedRegion(region.code)}
                onMouseLeave={() => setFocusedRegion("")}
                onFocus={() => setFocusedRegion(region.code)}
                onBlur={() => setFocusedRegion("")}
              >
                <path d="M30 0h60l30 52-30 52H30L0 52z" />
                <text x="60" y="47" textAnchor="middle">{region.code}</text>
                <text className="map-value" x="60" y="68" textAnchor="middle">
                  {region.value > 0 ? currency.format(region.value) : "No data"}
                </text>
              </g>
            );
          })}
        </svg>

        <aside className="map-summary" aria-live="polite">
          {active ? (
            <>
              <span>{active.code}</span>
              <h3>{active.name}</h3>
              <strong>{currency.format(active.value)}</strong>
              <p>{active.count.toLocaleString("en-CA")} published agreements</p>
              {selectedRegion === active.code && (
                <button onClick={() => onSelect("")}>Show all regions</button>
              )}
            </>
          ) : (
            <>
              <span>Map</span>
              <h3>Explore the regions</h3>
              <p>Hover, focus, or select a province or territory for its sample totals.</p>
            </>
          )}
        </aside>
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
          Unknown location: <strong>{unknown.count} agreements</strong>
          {unknown.value > 0 && ` · ${currency.format(unknown.value)}`}
        </p>
      </div>
    </section>
  );
}
