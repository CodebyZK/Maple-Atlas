import { useEffect, useMemo, useRef, useState } from "react";
import { createBeaconClient } from "./beaconClient";
import CanadaMap from "./CanadaMap";
import RecipientProfile from "./RecipientProfile";
import { createDataClient, DEFAULT_PAGE_SIZE } from "./dataClient";
import type {
  Grant,
  GrantFilters,
  GrantQueryResult,
  GrantSort
} from "./types";

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
    searchMode: "all",
    searchField: "all",
    province: "",
    department: "",
    dateField: "start",
    startDate: "",
    endDate: "",
    minimumValue: "",
    maximumValue: "",
    sort: "date_desc"
  });
  const [page, setPage] = useState(1);
  const [queryResult, setQueryResult] = useState<GrantQueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Grant | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const beaconClient = useMemo(() => createBeaconClient(), []);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);

  function closeDetails() {
    setSelected(null);
    setRecipientId(null);
  }

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

  function updateFilter<K extends keyof GrantFilters>(
    field: K,
    value: GrantFilters[K]
  ) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters((current) => ({
      query: "",
      searchMode: "all",
      searchField: "all",
      province: "",
      department: "",
      dateField: "start",
      startDate: "",
      endDate: "",
      minimumValue: "",
      maximumValue: "",
      sort: current.sort
    }));
    setPage(1);
  }

  const hasFilters = Boolean(
    filters.query ||
    filters.searchMode !== "all" ||
    filters.searchField !== "all" ||
    filters.province ||
    filters.department ||
    filters.dateField !== "start" ||
    filters.startDate ||
    filters.endDate ||
    filters.minimumValue ||
    filters.maximumValue
  );

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
            <span aria-hidden="true">&#x2315;</span>
            <span className="sr-only">Search grants</span>
            <input
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Search terms, exact phrases, recipients, programs, or places"
            />
          </label>
          <div className="search-tools" aria-label="Keyword search controls">
            <label>
              Match
              <select
                value={filters.searchMode}
                onChange={(event) => updateFilter("searchMode", event.target.value as GrantFilters["searchMode"])}
              >
                <option value="all">All words</option>
                <option value="any">Any word</option>
                <option value="phrase">Exact phrase</option>
              </select>
            </label>
            <label>
              Search in
              <select
                value={filters.searchField}
                onChange={(event) => updateFilter("searchField", event.target.value as GrantFilters["searchField"])}
              >
                <option value="all">All text fields</option>
                <option value="recipient">Recipient only</option>
                <option value="project">Project title only</option>
                <option value="program">Program only</option>
                <option value="department">Department only</option>
                <option value="description">Description only</option>
                <option value="location">City or province only</option>
              </select>
            </label>
          </div>
          <p className="sample-note">
            {queryResult
              ? `${queryResult.dataset.isSample ? "Development fallback" : "Complete Forge dataset"} - ${queryResult.dataset.recordCount.toLocaleString("en-CA")} records - retrieved ${date.format(new Date(queryResult.dataset.retrievedAt))}`
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
              <label>
                Date basis
                <select value={filters.dateField} onChange={(event) => updateFilter("dateField", event.target.value as GrantFilters["dateField"])}>
                  <option value="start">Agreement starts</option>
                  <option value="end">Agreement ends</option>
                  <option value="active">Active during range</option>
                </select>
              </label>
              <label>
                Starting on or after
                <input
                  type="date"
                  value={filters.startDate}
                  max={filters.endDate || undefined}
                  onChange={(event) => updateFilter("startDate", event.target.value)}
                />
              </label>
              <label>
                Starting on or before
                <input
                  type="date"
                  value={filters.endDate}
                  min={filters.startDate || undefined}
                  onChange={(event) => updateFilter("endDate", event.target.value)}
                />
              </label>
              <label>
                Minimum funding
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="decimal"
                  value={filters.minimumValue}
                  onChange={(event) => updateFilter("minimumValue", event.target.value)}
                  placeholder="Any amount"
                />
              </label>
              <label>
                Maximum funding
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="decimal"
                  value={filters.maximumValue}
                  onChange={(event) => updateFilter("maximumValue", event.target.value)}
                  placeholder="No ceiling"
                />
              </label>
              <label>
                Sort records
                <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value as GrantSort)}>
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="value_desc">Highest funding</option>
                  <option value="value_asc">Lowest funding</option>
                </select>
              </label>
              {hasFilters && (
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
                      <small>{[grant.city, grant.province, grant.department].filter(Boolean).join(" - ")}</small>
                      <small className="record-date">Starts {formatDate(grant.agreement_start_date)}</small>
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
        <span>MapleScope - Open public-funding data</span>
        <span>
          {!queryResult
            ? "Dataset information is loading."
            : queryResult.dataset.isSample
              ? "Development sample totals are not a complete measure of federal spending."
              : "Totals reflect the published Forge dataset version shown above."}
        </span>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeDetails}>
          <article
            className={recipientId ? "modal modal-wide" : "modal"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={recipientId ? "recipient-title" : "grant-title"}
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeDetails();
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="close" aria-label="Close details" onClick={closeDetails}>×</button>
            {recipientId ? (
              <RecipientProfile
                recipientId={recipientId}
                dataClient={dataClient}
                beaconClient={beaconClient}
                onClose={() => setRecipientId(null)}
              />
            ) : (
            <>
            <p className="eyebrow">{selected.department}</p>
            <h2 id="grant-title">{selected.recipient_name}</h2>
            <p className="modal-value">{currency.format(selected.agreement_value)}</p>
            <h3>{selected.agreement_title}</h3>
            <p>{selected.description}</p>
            <dl>
              <div><dt>Program</dt><dd>{selected.program_name ?? "Not published"}</dd></div>
              <div><dt>Location</dt><dd>{[selected.city, selected.province].filter(Boolean).join(", ") || "Not published"}</dd></div>
              <div><dt>Dates</dt><dd>{formatDate(selected.agreement_start_date)} - {formatDate(selected.agreement_end_date)}</dd></div>
              {selected.reference_number && (
                <div><dt>Reference</dt><dd>{selected.reference_number}</dd></div>
              )}
              {selected.amendment_count !== undefined && (
                <div>
                  <dt>Amendments</dt>
                  <dd>
                    {selected.amendment_count > 1
                      ? `Amended ${selected.amendment_count - 1} ${selected.amendment_count === 2 ? "time" : "times"}; value shown is amendment ${selected.amendment_number}`
                      : "Original agreement"}
                  </dd>
                </div>
              )}
            </dl>
            <div className="modal-actions">
              {selected.recipient_id && !selected.recipient_is_aggregate && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setRecipientId(selected.recipient_id ?? null)}
                >
                  See all funding to this recipient
                </button>
              )}
              <a className="primary-link" href={selected.source_url}>View source data ↗</a>
            </div>
            </>
            )}
          </article>
        </div>
      )}
    </>
  );
}
