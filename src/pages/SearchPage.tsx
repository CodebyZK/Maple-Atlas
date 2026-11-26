import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import CanadaMap from "../CanadaMap";
import type { DataClient } from "../dataClient";
import { DEFAULT_PAGE_SIZE } from "../dataClient";
import { placeName } from "../format";
import { Link, navigate, useLocation } from "../router";
import { DEFAULT_FILTERS, parseSearch, serializeSearch } from "../searchState";
import type { Grant, GrantFilters, GrantQueryResult, GrantSort } from "../types";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});
const compactCurrency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1
});
const date = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
const SEARCH_DELAY_MS = 350;

const EXAMPLES = [
  "clean energy",
  "Indigenous housing",
  "University of Toronto",
  "artificial intelligence",
  "wildfire"
];

const MATCH_LABELS: Record<GrantFilters["searchMode"], string> = {
  all: "All words",
  any: "Any word",
  phrase: "Exact phrase"
};
const FIELD_LABELS: Record<GrantFilters["searchField"], string> = {
  all: "All text fields",
  recipient: "Recipient",
  project: "Project title",
  program: "Program",
  department: "Department",
  description: "Description",
  location: "City or province"
};
const DATE_LABELS: Record<GrantFilters["dateField"], string> = {
  start: "Start date",
  end: "End date",
  active: "Active"
};

type Tab = "results" | "map" | "departments";

function formatDate(value: string | null): string {
  return value ? date.format(new Date(`${value}T00:00:00Z`)) : "Not published";
}

function amendmentText(grant: Grant): string | null {
  if (grant.amendment_count === undefined) return null;
  return grant.amendment_count > 1
    ? `Amended ${grant.amendment_count - 1} ${grant.amendment_count === 2 ? "time" : "times"}; value shown is amendment ${grant.amendment_number}`
    : "Original agreement";
}

interface Chip {
  key: string;
  label: string;
  clear: Partial<GrantFilters>;
}

function activeChips(filters: GrantFilters): Chip[] {
  const chips: Chip[] = [];
  if (filters.query) {
    chips.push({ key: "query", label: `“${filters.query}”`, clear: { query: "" } });
  }
  if (filters.searchMode !== "all") {
    chips.push({ key: "match", label: `Match: ${MATCH_LABELS[filters.searchMode]}`, clear: { searchMode: "all" } });
  }
  if (filters.searchField !== "all") {
    chips.push({ key: "field", label: `In: ${FIELD_LABELS[filters.searchField]}`, clear: { searchField: "all" } });
  }
  if (filters.province) {
    chips.push({ key: "province", label: filters.province, clear: { province: "" } });
  }
  if (filters.department) {
    chips.push({ key: "department", label: filters.department, clear: { department: "" } });
  }
  if (filters.startDate || filters.endDate) {
    const range = `${filters.startDate || "…"} to ${filters.endDate || "…"}`;
    chips.push({
      key: "dates",
      label: `${DATE_LABELS[filters.dateField]}: ${range}`,
      clear: { startDate: "", endDate: "", dateField: "start" }
    });
  }
  if (filters.minimumValue || filters.maximumValue) {
    const minimum = filters.minimumValue ? compactCurrency.format(Number(filters.minimumValue)) : "$0";
    const maximum = filters.maximumValue ? compactCurrency.format(Number(filters.maximumValue)) : "any";
    chips.push({ key: "value", label: `Value: ${minimum} – ${maximum}`, clear: { minimumValue: "", maximumValue: "" } });
  }
  return chips;
}

export default function SearchPage({ dataClient }: { dataClient: DataClient }) {
  const location = useLocation();
  const initial = useMemo(() => parseSearch(location.search), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<GrantFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [queryInput, setQueryInput] = useState(initial.filters.query);
  const [showMore, setShowMore] = useState(() =>
    ["searchMode", "searchField", "dateField", "startDate", "endDate", "minimumValue", "maximumValue"].some(
      (key) => initial.filters[key as keyof GrantFilters] !== DEFAULT_FILTERS[key as keyof GrantFilters]
    )
  );
  const [tab, setTab] = useState<Tab>("results");
  const [queryResult, setQueryResult] = useState<GrantQueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Grant | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Typing updates the query after a short pause instead of on every key.
  useEffect(() => {
    if (queryInput === filters.query) return;
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, query: queryInput }));
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [queryInput, filters.query]);

  // Keep the URL in step with the search so it can be shared or bookmarked.
  useEffect(() => {
    navigate(`/${serializeSearch({ filters, page })}`, { replace: true });
  }, [filters, page]);

  // Back and forward buttons restore an earlier search.
  useEffect(() => {
    if (location.pathname !== "/") return;
    if (location.search === serializeSearch({ filters, page })) return;
    const next = parseSearch(location.search);
    setFilters(next.filters);
    setQueryInput(next.filters.query);
    setPage(next.page);
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    dataClient
      .queryGrants({ ...filters, page, pageSize: DEFAULT_PAGE_SIZE }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setQueryResult(result);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Could not load grant data"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [dataClient, filters, page]);

  useEffect(() => {
    if (selected) dialogRef.current?.focus();
  }, [selected]);

  function updateFilter<K extends keyof GrantFilters>(field: K, value: GrantFilters[K]) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }

  function clearFilter(clear: Partial<GrantFilters>) {
    setFilters((current) => ({ ...current, ...clear }));
    if ("query" in clear) setQueryInput("");
    setPage(1);
  }

  function clearFilters() {
    setFilters((current) => ({ ...DEFAULT_FILTERS, sort: current.sort }));
    setQueryInput("");
    setPage(1);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setFilters((current) => ({ ...current, query: queryInput }));
    setPage(1);
    setTab("results");
  }

  function runExample(example: string) {
    setQueryInput(example);
    setFilters((current) => ({ ...current, query: example }));
    setPage(1);
    setTab("results");
  }

  function goToPage(next: number) {
    setPage(next);
    resultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const order: Tab[] = ["results", "map", "departments"];
    const index = order.indexOf(tab);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = order[(index + (event.key === "ArrowRight" ? 1 : order.length - 1)) % order.length];
      setTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    }
  }

  const chips = activeChips(filters);
  const results = queryResult?.records ?? [];
  const departments = queryResult?.departments ?? [];
  const maxDepartment = Math.max(1, ...departments.map((item) => item.value));
  const firstShown = queryResult && queryResult.totalRecords > 0 ? (queryResult.page - 1) * queryResult.pageSize + 1 : 0;
  const lastShown = queryResult ? Math.min(queryResult.totalRecords, queryResult.page * queryResult.pageSize) : 0;

  return (
    <>
      <section className="search-hero">
        <div className="search-hero-inner">
          <h1>Search Canadian federal grants</h1>
          <p className="hero-copy">
            Find who received federal grants and contributions, for what, and from which
            department. Every agreement the Government of Canada has published, counted once.
          </p>
          <form className="search" role="search" onSubmit={submitSearch}>
            <label htmlFor="grant-search" className="sr-only">Search grants</label>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              id="grant-search"
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search recipients, programs, places or keywords"
              autoComplete="off"
            />
            <button type="submit" className="search-button">Search</button>
          </form>
          <div className="examples" aria-label="Example searches">
            <span>Try:</span>
            {EXAMPLES.map((example) => (
              <button type="button" key={example} onClick={() => runExample(example)}>
                {example}
              </button>
            ))}
          </div>
          <p className="dataset-note">
            {queryResult
              ? queryResult.dataset.isSample
                ? `Development sample · ${queryResult.dataset.recordCount.toLocaleString("en-CA")} records`
                : `${queryResult.dataset.recordCount.toLocaleString("en-CA")} agreements · data retrieved ${date.format(new Date(queryResult.dataset.retrievedAt))} · `
              : "Loading dataset…"}
            {queryResult && !queryResult.dataset.isSample && <Link to="/methods">how we count</Link>}
          </p>
        </div>
      </section>

      <div className="search-layout">
        <section className="filter-bar" aria-label="Filters">
          <div className="filter-row">
            <label>
              Province or territory
              <select value={filters.province} onChange={(event) => updateFilter("province", event.target.value)}>
                <option value="">All regions</option>
                {queryResult?.provinceOptions.map((province) => <option key={province}>{province}</option>)}
              </select>
            </label>
            <label>
              Department
              <select value={filters.department} onChange={(event) => updateFilter("department", event.target.value)}>
                <option value="">All departments</option>
                {queryResult?.departmentOptions.map((department) => <option key={department}>{department}</option>)}
              </select>
            </label>
            <label>
              Sort by
              <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value as GrantSort)}>
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="value_desc">Highest value</option>
                <option value="value_asc">Lowest value</option>
              </select>
            </label>
            <button
              type="button"
              className="more-filters"
              aria-expanded={showMore}
              aria-controls="more-filters"
              onClick={() => setShowMore((value) => !value)}
            >
              {showMore ? "Fewer filters" : "More filters"}
            </button>
          </div>

          {showMore && (
            <div className="filter-row more" id="more-filters">
              <label>
                Match
                <select value={filters.searchMode} onChange={(event) => updateFilter("searchMode", event.target.value as GrantFilters["searchMode"])}>
                  <option value="all">All words</option>
                  <option value="any">Any word</option>
                  <option value="phrase">Exact phrase</option>
                </select>
              </label>
              <label>
                Search in
                <select value={filters.searchField} onChange={(event) => updateFilter("searchField", event.target.value as GrantFilters["searchField"])}>
                  {Object.entries(FIELD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{value === "all" ? label : `${label} only`}</option>
                  ))}
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
                From
                <input type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={(event) => updateFilter("startDate", event.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(event) => updateFilter("endDate", event.target.value)} />
              </label>
              <label>
                Minimum value
                <input type="number" min="0" step="1000" inputMode="decimal" value={filters.minimumValue} onChange={(event) => updateFilter("minimumValue", event.target.value)} placeholder="Any amount" />
              </label>
              <label>
                Maximum value
                <input type="number" min="0" step="1000" inputMode="decimal" value={filters.maximumValue} onChange={(event) => updateFilter("maximumValue", event.target.value)} placeholder="No ceiling" />
              </label>
            </div>
          )}

          {chips.length > 0 && (
            <div className="active-filters" aria-label="Active filters">
              {chips.map((chip) => (
                <button type="button" key={chip.key} className="filter-chip" onClick={() => clearFilter(chip.clear)}>
                  {chip.label}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Remove filter</span>
                </button>
              ))}
              <button type="button" className="clear" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </section>

        {error ? (
          <p className="error" role="alert">{error}</p>
        ) : !queryResult ? (
          <div className="loading-block" role="status">Loading grant data…</div>
        ) : (
          <div className="results-area" aria-busy={loading} ref={resultsRef}>
            <div className="metrics" aria-live="polite">
              <article><span>Total value</span><strong>{compactCurrency.format(queryResult.totalFunding)}</strong><small>{currency.format(queryResult.totalFunding)}</small></article>
              <article><span>Agreements</span><strong>{queryResult.totalRecords.toLocaleString("en-CA")}</strong><small>each counted once, at its latest amendment</small></article>
              <article><span>Recipients</span><strong>{queryResult.recipientCount.toLocaleString("en-CA")}</strong><small>distinct published names</small></article>
            </div>

            <div className="tabs" role="tablist" aria-label="Views">
              {(["results", "map", "departments"] as Tab[]).map((name) => (
                <button
                  key={name}
                  id={`tab-${name}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === name}
                  aria-controls={`panel-${name}`}
                  tabIndex={tab === name ? 0 : -1}
                  onClick={() => setTab(name)}
                  onKeyDown={handleTabKey}
                >
                  {name === "results" ? "Agreements" : name === "map" ? "Map" : "Departments"}
                </button>
              ))}
              {loading && <span className="updating" role="status">Updating…</span>}
            </div>

            {tab === "results" && (
              <section id="panel-results" role="tabpanel" aria-labelledby="tab-results" className="panel records-panel">
                <p className="results-count">
                  {queryResult.totalRecords > 0
                    ? `Showing ${firstShown.toLocaleString("en-CA")}–${lastShown.toLocaleString("en-CA")} of ${queryResult.totalRecords.toLocaleString("en-CA")} agreements`
                    : "No agreements match"}
                </p>
                <div className="record-list">
                  {results.map((grant) => (
                    <article className="record" key={grant.record_id}>
                      <div className="record-main">
                        {grant.recipient_id && !grant.recipient_is_aggregate ? (
                          <Link className="record-recipient" to={`/recipients/${encodeURIComponent(grant.recipient_id)}`}>
                            {grant.recipient_name}
                          </Link>
                        ) : (
                          <span className="record-recipient">{grant.recipient_name}</span>
                        )}
                        <button type="button" className="record-title" onClick={() => setSelected(grant)}>
                          {grant.agreement_title || grant.program_name || "Untitled agreement"}
                        </button>
                        <span className="record-meta">
                          {[grant.department, placeName(grant.city, grant.province), formatDate(grant.agreement_start_date)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <span className="record-value">{currency.format(grant.agreement_value)}</span>
                    </article>
                  ))}
                  {!results.length && (
                    <div className="empty-state">
                      <strong>No agreements match these filters.</strong>
                      <p>Try fewer words, “Any word” matching, or removing a filter.</p>
                      {chips.length > 0 && <button type="button" className="clear" onClick={clearFilters}>Clear filters</button>}
                    </div>
                  )}
                </div>
                {queryResult.totalPages > 1 && (
                  <nav className="pagination" aria-label="Result pages">
                    <button type="button" disabled={queryResult.page === 1 || loading} onClick={() => goToPage(Math.max(1, page - 1))}>
                      Previous
                    </button>
                    <span>
                      Page {queryResult.page.toLocaleString("en-CA")} of {queryResult.totalPages.toLocaleString("en-CA")}
                    </span>
                    <button type="button" disabled={queryResult.page === queryResult.totalPages || loading} onClick={() => goToPage(page + 1)}>
                      Next
                    </button>
                  </nav>
                )}
              </section>
            )}

            {tab === "map" && (
              <div id="panel-map" role="tabpanel" aria-labelledby="tab-map">
                <CanadaMap
                  regions={queryResult.regions}
                  unknown={queryResult.unknownRegion}
                  isSample={queryResult.dataset.isSample}
                  selectedRegion={filters.province}
                  onSelect={(province) => updateFilter("province", province)}
                />
              </div>
            )}

            {tab === "departments" && (
              <section id="panel-departments" role="tabpanel" aria-labelledby="tab-departments" className="panel chart-panel">
                <div className="panel-heading">
                  <div><h2>Leading departments</h2></div>
                  <span>by total agreement value</span>
                </div>
                <div className="bars">
                  {departments.map((department) => (
                    <button
                      type="button"
                      className="bar-row"
                      key={department.name}
                      onClick={() => {
                        updateFilter("department", department.name);
                        setTab("results");
                      }}
                    >
                      <div><span>{department.name}</span><strong>{compactCurrency.format(department.value)}</strong></div>
                      <div className="bar-track">
                        <span style={{ width: `${department.value > 0 ? (department.value / maxDepartment) * 100 : 0}%` }} />
                      </div>
                      <small>{department.count.toLocaleString("en-CA")} agreements · select to filter</small>
                    </button>
                  ))}
                  {!departments.length && <p>No departments match these filters.</p>}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

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
              if (event.key === "Escape") setSelected(null);
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
              <div><dt>Location</dt><dd>{placeName(selected.city, selected.province) || "Not published"}</dd></div>
              <div><dt>Dates</dt><dd>{formatDate(selected.agreement_start_date)} – {formatDate(selected.agreement_end_date)}</dd></div>
              {selected.reference_number && <div><dt>Reference</dt><dd>{selected.reference_number}</dd></div>}
              {amendmentText(selected) && <div><dt>Amendments</dt><dd>{amendmentText(selected)}</dd></div>}
            </dl>
            <div className="modal-actions">
              {selected.recipient_id && !selected.recipient_is_aggregate && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    const id = selected.recipient_id ?? "";
                    setSelected(null);
                    navigate(`/recipients/${encodeURIComponent(id)}`);
                  }}
                >
                  See all funding to this recipient
                </button>
              )}
              <a className="secondary-link" href={selected.source_url}>View source data ↗</a>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
