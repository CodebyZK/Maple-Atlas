import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FundingTotal, LocationTotal, RegionTotal } from "./types";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1
});

const regionCoordinates: Record<string, [number, number]> = {
  YT: [63.2, -135.8],
  NT: [64.8, -119.5],
  NU: [67.3, -95.7],
  BC: [53.7, -124.8],
  AB: [53.9, -115.0],
  SK: [52.9, -106.4],
  MB: [54.8, -97.0],
  ON: [50.1, -85.3],
  QC: [52.5, -71.8],
  NB: [46.6, -66.4],
  PE: [46.4, -63.3],
  NS: [45.0, -63.0],
  NL: [53.2, -60.0]
};

const cityCoordinates: Record<string, [number, number]> = {
  "AB|CALGARY": [51.0447, -114.0719],
  "AB|EDMONTON": [53.5461, -113.4938],
  "AB|LETHBRIDGE": [49.6956, -112.8451],
  "AB|RED DEER": [52.2681, -113.8112],
  "BC|BURNABY": [49.2488, -122.9805],
  "BC|KELOWNA": [49.888, -119.496],
  "BC|PRINCE GEORGE": [53.9171, -122.7497],
  "BC|RICHMOND": [49.1666, -123.1336],
  "BC|SURREY": [49.1913, -122.849],
  "BC|VANCOUVER": [49.2827, -123.1207],
  "BC|VICTORIA": [48.4284, -123.3656],
  "MB|BRANDON": [49.8485, -99.9501],
  "MB|DAUPHIN": [51.1494, -100.0502],
  "MB|WINNIPEG": [49.8951, -97.1384],
  "NB|FREDERICTON": [45.9636, -66.6431],
  "NB|MONCTON": [46.0878, -64.7782],
  "NB|SAINT JOHN": [45.2733, -66.0633],
  "NL|CORNER BROOK": [48.9500, -57.9500],
  "NL|ST. JOHN'S": [47.5615, -52.7126],
  "NS|DARTMOUTH": [44.6713, -63.5772],
  "NS|HALIFAX": [44.6488, -63.5752],
  "NS|SYDNEY": [46.1368, -60.1942],
  "NT|YELLOWKNIFE": [62.4540, -114.3718],
  "NU|IQALUIT": [63.7467, -68.5170],
  "ON|BRAMPTON": [43.7315, -79.7624],
  "ON|HAMILTON": [43.2557, -79.8711],
  "ON|KINGSTON": [44.2312, -76.4860],
  "ON|LONDON": [42.9849, -81.2453],
  "ON|MISSISSAUGA": [43.5890, -79.6441],
  "ON|OTTAWA": [45.4215, -75.6972],
  "ON|PETERBOROUGH": [44.3091, -78.3197],
  "ON|SAULT STE. MARIE": [46.5219, -84.3461],
  "ON|TORONTO": [43.6532, -79.3832],
  "ON|WATERLOO": [43.4643, -80.5204],
  "ON|WINDSOR": [42.3149, -83.0364],
  "PE|CHARLOTTETOWN": [46.2382, -63.1311],
  "QC|GATINEAU": [45.4765, -75.7013],
  "QC|LAVAL": [45.6066, -73.7124],
  "QC|MONTREAL": [45.5017, -73.5673],
  "QC|MONTR\u00c9AL": [45.5017, -73.5673],
  "QC|QUEBEC": [46.8139, -71.2080],
  "QC|QU\u00c9BEC": [46.8139, -71.2080],
  "QC|SHERBROOKE": [45.4042, -71.8929],
  "QC|TROIS-RIVIERES": [46.3432, -72.5430],
  "QC|TROIS-RIVI\u00c8RES": [46.3432, -72.5430],
  "SK|REGINA": [50.4452, -104.6189],
  "SK|SASKATOON": [52.1579, -106.6702],
  "SK|WADENA": [51.9420, -103.8010],
  "YT|WHITEHORSE": [60.7212, -135.0568]
};

interface CanadaMapProps {
  regions: RegionTotal[];
  locations: LocationTotal[];
  unknown: FundingTotal;
  isSample: boolean;
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

function levelColor(level: number): string {
  return [
    "#dfe3de",
    "#c5d9d0",
    "#8db7a5",
    "#518d77",
    "#28634f",
    "#123f33"
  ][level] ?? "#dfe3de";
}

function normalizeCity(value: string | null): string | null {
  if (!value) return null;
  const [first] = value.split(/[|,]/);
  const normalized = first.trim().replace(/\s+/g, " ").toLocaleUpperCase();
  return normalized || null;
}

function locationCoordinate(location: LocationTotal): {
  coordinate: [number, number] | null;
  approximate: boolean;
} {
  const city = normalizeCity(location.city);
  const province = location.province;
  if (city && province) {
    const coordinate = cityCoordinates[`${province}|${city}`];
    if (coordinate) return { coordinate, approximate: false };
  }

  if (province && regionCoordinates[province]) {
    return { coordinate: regionCoordinates[province], approximate: true };
  }

  return { coordinate: null, approximate: true };
}

function popupHtml(title: string, value: number, count: number, approximate = false): string {
  return `
    <strong>${title}</strong><br />
    ${currency.format(value)}<br />
    ${count.toLocaleString("en-CA")} agreements${approximate ? "<br /><small>Approximate location</small>" : ""}
  `;
}

export default function CanadaMap({
  regions,
  locations,
  unknown,
  isSample,
  selectedRegion,
  onSelect
}: CanadaMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const overlay = useRef<L.LayerGroup | null>(null);
  const [focusedRegion, setFocusedRegion] = useState("");
  const maximum = Math.max(...regions.map((region) => region.value), 1);
  const maxLocation = Math.max(...locations.map((location) => location.value), 1);
  const active = regions.find(
    (region) => region.code === (focusedRegion || selectedRegion)
  );

  const selectedBounds = useMemo(() => {
    const coordinate = selectedRegion ? regionCoordinates[selectedRegion] : null;
    return coordinate
      ? L.latLngBounds([
        [coordinate[0] - 4, coordinate[1] - 7],
        [coordinate[0] + 4, coordinate[1] + 7]
      ])
      : null;
  }, [selectedRegion]);

  useEffect(() => {
    if (!mapElement.current || map.current) return;

    map.current = L.map(mapElement.current, {
      center: [58.2, -96],
      zoom: 3,
      minZoom: 2,
      maxZoom: 9,
      scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map.current);

    overlay.current = L.layerGroup().addTo(map.current);
    window.setTimeout(() => map.current?.invalidateSize(), 0);

    return () => {
      map.current?.remove();
      map.current = null;
      overlay.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !overlay.current) return;

    overlay.current.clearLayers();

    for (const region of regions) {
      const coordinate = regionCoordinates[region.code];
      if (!coordinate) continue;

      const level = colorLevel(region.value, maximum);
      const radius = region.value > 0
        ? 12 + Math.sqrt(region.value / maximum) * 28
        : 8;
      L.circleMarker(coordinate, {
        radius,
        color: selectedRegion === region.code ? "#c54332" : "#173f35",
        weight: selectedRegion === region.code ? 4 : 2,
        fillColor: levelColor(level),
        fillOpacity: 0.72
      })
        .bindTooltip(`${region.name}: ${currency.format(region.value)}`)
        .bindPopup(popupHtml(region.name, region.value, region.count))
        .on("click", () => onSelect(region.code))
        .on("mouseover", () => setFocusedRegion(region.code))
        .on("mouseout", () => setFocusedRegion(""))
        .addTo(overlay.current);
    }

    for (const location of locations) {
      const { coordinate, approximate } = locationCoordinate(location);
      if (!coordinate) continue;

      const radius = 5 + Math.sqrt(location.value / maxLocation) * 15;
      L.circleMarker(coordinate, {
        radius,
        color: "#7f2a22",
        weight: 2,
        fillColor: approximate ? "#f1b64a" : "#c54332",
        fillOpacity: approximate ? 0.48 : 0.78
      })
        .bindTooltip(location.name)
        .bindPopup(popupHtml(location.name, location.value, location.count, approximate))
        .on("click", () => {
          if (location.province) onSelect(location.province);
        })
        .addTo(overlay.current);
    }

    if (selectedBounds) {
      map.current.fitBounds(selectedBounds, { padding: [30, 30], maxZoom: 6 });
    }
  }, [locations, maxLocation, maximum, onSelect, regions, selectedBounds, selectedRegion]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, code: string) {
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
          <h2>Funding map</h2>
        </div>
        <span>Zoom, inspect pins, or select a region</span>
      </div>

      <div className="map-layout">
        <div
          className="map-canvas"
          ref={mapElement}
          role="application"
          aria-label="Interactive map of Canadian funding locations"
        />

        <aside className="map-summary" aria-live="polite">
          {active ? (
            <>
              <span>{active.code}</span>
              <h3>{active.name}</h3>
              <strong>{currency.format(active.value)}</strong>
              <p>{active.count.toLocaleString("en-CA")} published agreements</p>
              {selectedRegion === active.code && (
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
                Heat circles show province and territory totals; pins show top
                {isSample ? " sample" : " matching"} locations.
              </p>
            </>
          )}
        </aside>
      </div>

      <div className="region-selector" aria-label="Funding value by province and territory">
        {regions.map((region) => {
          const selected = selectedRegion === region.code;
          return (
            <button
              type="button"
              className={`region-chip level-${colorLevel(region.value, maximum)}${selected ? " selected" : ""}`}
              key={region.code}
              aria-pressed={selected}
              aria-label={`${region.name}: ${currency.format(region.value)}, ${region.count} agreements`}
              onClick={() => onSelect(region.code)}
              onKeyDown={(event) => handleKeyDown(event, region.code)}
              onMouseEnter={() => setFocusedRegion(region.code)}
              onMouseLeave={() => setFocusedRegion("")}
              onFocus={() => setFocusedRegion(region.code)}
              onBlur={() => setFocusedRegion("")}
            >
              <strong>{region.code}</strong>
              <span>{region.value > 0 ? currency.format(region.value) : "No data"}</span>
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
          Unknown location: <strong>{unknown.count} agreements</strong>
          {unknown.value > 0 && ` - ${currency.format(unknown.value)}`}
        </p>
      </div>
    </section>
  );
}
