import { useEffect, useMemo, useRef, useState } from "react";
import { filterGrants, fundingByDepartment, loadGrants, uniqueValues } from "./data";
import type { Grant, GrantFilters } from "./types";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

const date = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

function formatDate(value: string | null): string {
  return value ? date.format(new Date(`${value}T00:00:00Z`)) : "Not published";
}

export default function App() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [filters, setFilters] = useState<GrantFilters>({
    query: "",
    province: "",
    department: ""
  });
  const [selected, setSelected] = useState<Grant | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    loadGrants().then(setGrants).catch((reason: unknown) => {
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Could not load grant data";
      setError(message);
    });
  }, []);

  useEffect(() => {
    if (selected) {
      dialogRef.current?.focus();
    }
  }, [selected]);

  const results = useMemo(() => filterGrants(grants, filters), [grants, filters]);
  const departments = useMemo(() => fundingByDepartment(results), [results]);
  const totalFunding = useMemo(
    () => results.reduce((sum, grant) => sum + grant.agreement_value, 0),
    [results]
  );
  const recipientCount = useMemo(
    () => new Set(results.map((grant) => grant.recipient_name)).size,
    [results]
  );
  const provinces = useMemo(() => uniqueValues(grants, "province"), [grants]);
  const departmentOptions = useMemo(
    () => uniqueValues(grants, "department"),
    [grants]
  );
  const leadingDepartmentValue = departments[0]?.value;
  const maxDepartmentValue =
    leadingDepartmentValue && leadingDepartmentValue > 0
      ? leadingDepartmentValue
      : 1;

  function updateFilter(field: keyof GrantFilters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Maple Atlas home">
          <span className="brand-mark">M</span>
          <span>Maple <strong>Atlas</strong></span>
        </a>
        <a className="source-link" href="https://open.canada.ca/data/en/dataset/432527ab-7aac-45b5-81d6-7597107a7013">
          Government source ↗
        </a>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Canadian public funding, made explorable</p>
          <h1>See where federal grant funding goes.</h1>
          <p className="hero-copy">
            Search recipients, compare departments, and inspect published funding
            agreements from the Maple Forge development sample.
          </p>
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search grants</span>
            <input
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Search recipients, projects, programs, or places"
            />
          </label>
          <p className="sample-note">Development preview · 500 deterministic records</p>
        </section>

        {error ? <p className="error" role="alert">{error}</p> : (
          <section className="dashboard" aria-busy={!grants.length}>
            <div className="filters">
              <label>
                Province or territory
                <select value={filters.province} onChange={(event) => updateFilter("province", event.target.value)}>
                  <option value="">All regions</option>
                  {provinces.map((province) => <option key={province}>{province}</option>)}
                </select>
              </label>
              <label>
                Department
                <select value={filters.department} onChange={(event) => updateFilter("department", event.target.value)}>
                  <option value="">All departments</option>
                  {departmentOptions.map((department) => <option key={department}>{department}</option>)}
                </select>
              </label>
              {(filters.query || filters.province || filters.department) && (
                <button className="clear" onClick={() => setFilters({ query: "", province: "", department: "" })}>
                  Clear filters
                </button>
              )}
            </div>

            <div className="metrics">
              <article><span>Published funding</span><strong>{currency.format(totalFunding)}</strong></article>
              <article><span>Agreements</span><strong>{results.length.toLocaleString("en-CA")}</strong></article>
              <article><span>Recipients</span><strong>{recipientCount.toLocaleString("en-CA")}</strong></article>
            </div>

            <div className="content-grid">
              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">Overview</p><h2>Leading departments</h2></div>
                  <span>by published value</span>
                </div>
                <div className="bars">
                  {departments.map((department) => (
                    <div className="bar-row" key={department.name}>
                      <div><span>{department.name}</span><strong>{currency.format(department.value)}</strong></div>
                      <div className="bar-track">
                        <span
                          style={{
                            width: `${Number.isFinite(department.value) && department.value > 0
                              ? (department.value / maxDepartmentValue) * 100
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {!departments.length && <p>No departments match these filters.</p>}
                </div>
              </section>

              <section className="panel records-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">Agreements</p><h2>Funding records</h2></div>
                  <span>{results.length} results</span>
                </div>
                <div className="record-list">
                  {results.slice(0, 50).map((grant) => (
                    <button className="record" key={grant.record_id} onClick={() => setSelected(grant)}>
                      <span className="record-value">{currency.format(grant.agreement_value)}</span>
                      <strong>{grant.recipient_name}</strong>
                      <span>{grant.agreement_title || grant.program_name || "Untitled agreement"}</span>
                      <small>{[grant.city, grant.province, grant.department].filter(Boolean).join(" · ")}</small>
                    </button>
                  ))}
                  {results.length > 50 && <p className="result-limit">Showing the first 50 matching records. Refine the filters to narrow the list.</p>}
                </div>
              </section>
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>MapleScope · Open public-funding data</span>
        <span>Sample data is not a complete measure of federal spending.</span>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <article
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="grant-title"
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSelected(null);
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="close" aria-label="Close details" onClick={() => setSelected(null)}>×</button>
            <p className="eyebrow">{selected.department}</p>
            <h2 id="grant-title">{selected.recipient_name}</h2>
            <p className="modal-value">{currency.format(selected.agreement_value)}</p>
            <h3>{selected.agreement_title}</h3>
            <p>{selected.description}</p>
            <dl>
              <div><dt>Program</dt><dd>{selected.program_name ?? "Not published"}</dd></div>
              <div><dt>Location</dt><dd>{[selected.city, selected.province].filter(Boolean).join(", ") || "Not published"}</dd></div>
              <div><dt>Dates</dt><dd>{formatDate(selected.agreement_start_date)} – {formatDate(selected.agreement_end_date)}</dd></div>
            </dl>
            <a className="primary-link" href={selected.source_url}>View source data ↗</a>
          </article>
        </div>
      )}
    </>
  );
}
