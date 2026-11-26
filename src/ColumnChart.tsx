import { useId, useState } from "react";

export interface ColumnDatum {
  key: string;
  label: string;
  value: number;
  /** Secondary tooltip and table line, such as "3 agreements". */
  detail?: string;
}

interface ColumnChartProps {
  title: string;
  items: ColumnDatum[];
  format: (value: number) => string;
  formatAxis: (value: number) => string;
  /** Column header for the label column in the table view. */
  labelHeading: string;
  height?: number;
}

const WIDTH = 640;
const MARGIN = { top: 22, right: 8, bottom: 26, left: 56 };
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

function niceStep(maximum: number, ticks: number): number {
  const raw = maximum / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Column with a 4px rounded data end and a square baseline. */
function columnPath(x: number, y: number, width: number, baseline: number): string {
  const height = baseline - y;
  const radius = Math.min(RADIUS, width / 2, height);
  return [
    `M${x},${baseline}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + width - radius}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `V${baseline}`,
    "Z"
  ].join(" ");
}

/**
 * A single-series column chart: no legend (the title names the series), a
 * hover and focus tooltip on every column, and a table view with every value.
 * Negative values are drawn at zero height; the table and tooltip keep them.
 */
export default function ColumnChart({
  title,
  items,
  format,
  formatAxis,
  labelHeading,
  height = 220
}: ColumnChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + innerHeight;
  const maximum = Math.max(0, ...items.map((item) => item.value));
  const step = niceStep(maximum || 1, 3);
  const axisMaximum = Math.max(step, Math.ceil((maximum || 1) / step) * step);
  const ticks = Array.from(
    { length: Math.round(axisMaximum / step) + 1 },
    (_, index) => index * step
  );
  const band = items.length ? innerWidth / items.length : innerWidth;
  const barWidth = Math.max(2, Math.min(MAX_BAR, band - GAP));
  const scale = (value: number) => baseline - (Math.max(0, value) / axisMaximum) * innerHeight;
  const peak = items.reduce(
    (best, item, index) => (best === -1 || item.value > items[best].value ? index : best),
    -1
  );
  // Label every nth year so axis labels never collide.
  const labelEvery = Math.max(1, Math.ceil(items.length / Math.floor(innerWidth / 44)));
  const activeItem = active === null ? null : items[active];

  return (
    <figure className="column-chart" aria-labelledby={titleId}>
      <figcaption className="chart-heading">
        <span id={titleId}>{title}</span>
        <button type="button" className="text-button" onClick={() => setShowTable((value) => !value)}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </figcaption>

      {showTable ? (
        <table className="chart-table">
          <thead>
            <tr><th scope="col">{labelHeading}</th><th scope="col">Value</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <th scope="row">{item.label}</th>
                <td>{format(item.value)}{item.detail ? <small> · {item.detail}</small> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="chart-frame">
          <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-labelledby={titleId}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  className="chart-grid"
                  x1={MARGIN.left}
                  x2={WIDTH - MARGIN.right}
                  y1={scale(tick)}
                  y2={scale(tick)}
                />
                <text className="chart-axis" x={MARGIN.left - 8} y={scale(tick)} dy="0.32em" textAnchor="end">
                  {formatAxis(tick)}
                </text>
              </g>
            ))}
            {items.map((item, index) => {
              const center = MARGIN.left + band * index + band / 2;
              const top = scale(item.value);
              return (
                <g key={item.key}>
                  {top < baseline && (
                    <path
                      className={index === active ? "chart-column is-active" : "chart-column"}
                      d={columnPath(center - barWidth / 2, top, barWidth, baseline)}
                    />
                  )}
                  {index === peak && item.value > 0 && (
                    <text className="chart-value" x={center} y={top - 6} textAnchor="middle">
                      {formatAxis(item.value)}
                    </text>
                  )}
                  {index % labelEvery === 0 && (
                    <text className="chart-axis" x={center} y={baseline + 17} textAnchor="middle">
                      {item.label}
                    </text>
                  )}
                  <rect
                    className="chart-hit"
                    x={center - band / 2}
                    y={MARGIN.top}
                    width={band}
                    height={innerHeight}
                    tabIndex={0}
                    aria-label={`${item.label}: ${format(item.value)}${item.detail ? `, ${item.detail}` : ""}`}
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                  />
                </g>
              );
            })}
          </svg>
          {activeItem && active !== null && (
            <div
              className="chart-tooltip"
              role="status"
              style={{
                left: `${((MARGIN.left + band * active + band / 2) / WIDTH) * 100}%`,
                top: `${(scale(activeItem.value) / height) * 100}%`
              }}
            >
              <strong>{format(activeItem.value)}</strong>
              <span>{activeItem.label}{activeItem.detail ? ` · ${activeItem.detail}` : ""}</span>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
