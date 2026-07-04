import { useEffect, useMemo, useRef, useState } from "react";
import CanadaMap from "./CanadaMap";
import { createDataClient, DEFAULT_PAGE_SIZE } from "./dataClient";
import type { Grant, GrantFilters, GrantQueryResult } from "./types";

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
  const dataClient = useMemo(() => createDataClient(), []);
  const [filters, setFilters] = useState<GrantFilters>({
    query: "",
    province: "",
    department: ""
  });
  const [page, setPage] = useState(1);
  const [queryResult, setQueryResult] = useState<GrantQueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Grant | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    dataClient.queryGrants(
      { ...filters, page, pageSize: DEFAULT_PAGE_SIZE },
      controller.signal
    ).then((result) => {
      if (!controller.signal.aborted) setQueryResult(result);
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Could not load grant data";
      setError(message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [dataClient, filters, page]);

  useEffect(() => {
    if (selected) {
      dialogRef.current?.focus();
    }
  }, [selected]);

  const results = queryResult?.records ?? [];
  const departments = queryResult?.departments ?? [];
  const leadingDepartmentValue = departments[0]?.value;
  const maxDepartmentValue =
    leadingDepartmentValue && leadingDepartmentValue > 0
      ? leadingDepartmentValue
      : 1;

  function updateFilter(field: keyof GrantFilters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ query: "", province: "", department: "" });
    setPage(1);
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
            agreements processed by Maple Forge.
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
          <p className="sample-note">
            {queryResult
              ? `${queryResult.dataset.isSample ? "Development fallback" : "Complete Forge dataset"} · ${queryResult.dataset.recordCount.toLocaleString("en-CA")} records · retrieved ${date.format(new Date(queryResult.dataset.retrievedAt))}`
              : "Loading dataset information…"}
          </p>
        </section>

        {error ? <p className="error" role="alert">{error}</p> : !queryResult ? (
          <p className="loading" role="status">Loading grant data…</p>
        ) : (
          <section className="dashboard" aria-busy={loading}>
            <div className="filters">
              <label>
                Province or territory
                <select value={filters.province} onChange={(event) => updateFilter("province", event.target.value)}>
                  <option value="">All regions</option>
                  {queryResult.provinceOptions.map((province) => <option key={province}>{province}</option>)}
                </select>
              </label>
              <label>
                Department
                <select value={filters.department} onChange={(event) => updateFilter("department", event.target.value)}>
                  <option value="">All departments</option>
                  {queryResult.departmentOptions.map((department) => <option key={department}>{department}</option>)}
                </select>
              </label>
              {(filters.query || filters.province || filters.department) && (
                <button type="button" className="clear" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>

            <div className="metrics">
              <article><span>Published funding</span><strong>{currency.format(queryResult.totalFunding)}</strong></article>
              <article><span>Agreements</span><strong>{queryResult.totalRecords.toLocaleString("en-CA")}</strong></article>
              <article><span>Recipients</span><strong>{queryResult.recipientCount.toLocaleString("en-CA")}</strong></article>
            </div>

            <CanadaMap
              regions={queryResult.regions}
              unknown={queryResult.unknownRegion}
              isSample={queryResult.dataset.isSample}
              selectedRegion={filters.province}
              onSelect={(province) => updateFilter("province", province)}
            />

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
                  <span>{queryResult.totalRecords.toLocaleString("en-CA")} results</span>
                </div>
                <div className="record-list">
                  {results.map((grant) => (
                    <button type="button" className="record" key={grant.record_id} onClick={() => setSelected(grant)}>
                      <span className="record-value">{currency.format(grant.agreement_value)}</span>
                      <strong>{grant.recipient_name}</strong>
                      <span>{grant.agreement_title || grant.program_name || "Untitled agreement"}</span>
                      <small>{[grant.city, grant.province, grant.department].filter(Boolean).join(" · ")}</small>
                    </button>
                  ))}
                  {!results.length && <p>No funding records match these filters.</p>}
                </div>
                {queryResult.totalPages > 1 && (
                  <nav className="pagination" aria-label="Funding record pages">
                    <button
                      type="button"
                      disabled={queryResult.page === 1 || loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </button>
                    <span>
                      Page {queryResult.page.toLocaleString("en-CA")} of{" "}
                      {queryResult.totalPages.toLocaleString("en-CA")}
                    </span>
                    <button
                      type="button"
                      disabled={queryResult.page === queryResult.totalPages || loading}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </section>
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>MapleScope · Open public-funding data</span>
        <span>
          {!queryResult
            ? "Dataset information is loading."
            : queryResult.dataset.isSample
              ? "Development sample totals are not a complete measure of federal spending."
              : "Totals reflect the published Forge dataset version shown above."}
        </span>
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
            <button type="button" className="close" aria-label="Close details" onClick={() => setSelected(null)}>×</button>
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
