import type { CharityInfo } from "./types";

const compactCurrency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1
});
const percent = new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

function money(value: number | null): string {
  return value === null ? "Not reported" : compactCurrency.format(value);
}

function share(part: number | null, whole: number | null): string | null {
  return part !== null && whole !== null && whole > 0 ? percent.format(part / whole) : null;
}

/**
 * Figures from a registered charity's own T3010 return (CRA). They describe
 * the charity's whole finances and are never added to grant totals.
 */
export default function CharityCard({ charity }: { charity: CharityInfo }) {
  const a = charity.amounts;
  const levels = [
    { label: "Federal", value: a.revenue_federal },
    { label: "Provincial or territorial", value: a.revenue_provincial },
    { label: "Municipal or regional", value: a.revenue_municipal }
  ].filter((level) => level.value !== null) as { label: string; value: number }[];
  const maxLevel = Math.max(1, ...levels.map((level) => level.value));
  const governmentShare = share(a.revenue_government_total, a.total_revenue);
  const programShare = share(a.charitable_programs, a.total_expenditures);

  return (
    <section className="charity-card" aria-labelledby="charity-title">
      <div className="charity-heading">
        <h3 id="charity-title">Registered charity</h3>
        <span className="badge">{[charity.designation, charity.category].filter(Boolean).join(" · ") || "Charity"}</span>
      </div>
      <p className="muted">
        From {charity.legalName}'s T3010 return
        {charity.fiscalPeriodEnd ? ` for the fiscal year ending ${date.format(new Date(`${charity.fiscalPeriodEnd}T00:00:00Z`))}` : ""}.
        These cover all of the charity's finances and are separate from the grant totals above.
      </p>

      <dl className="stat-tiles">
        <div><dt>Total revenue</dt><dd>{money(a.total_revenue)}</dd></div>
        <div>
          <dt>From governments</dt>
          <dd>{money(a.revenue_government_total)}</dd>
          {governmentShare && <small>{governmentShare} of revenue</small>}
        </div>
        <div><dt>Total expenditures</dt><dd>{money(a.total_expenditures)}</dd></div>
        <div>
          <dt>Charitable programs</dt>
          <dd>{money(a.charitable_programs)}</dd>
          {programShare && <small>{programShare} of spending</small>}
        </div>
      </dl>

      {levels.length > 0 ? (
        <>
          <h4>Government revenue by level</h4>
          <ul className="bar-list">
            {levels.map((level) => (
              <li key={level.label}>
                <span className="bar-label">{level.label}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(Math.max(0, level.value) / maxLevel) * 100}%` }} />
                </span>
                <span className="bar-value">{compactCurrency.format(level.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : a.revenue_government_total !== null ? (
        <p className="muted">This charity reports government revenue as one combined amount.</p>
      ) : null}

      <p className="beacon-meta">
        Registration {charity.registrationNumber} · Source:{" "}
        <a href={charity.sourceUrl}>{charity.source} ({charity.listYear})</a>, Open Government Licence – Canada
      </p>
    </section>
  );
}
