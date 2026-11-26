import { useEffect, useRef, useState } from "react";
import { BeaconError, type BeaconClient } from "./beaconClient";
import ColumnChart from "./ColumnChart";
import type { DataClient } from "./dataClient";
import { continuousYears } from "./recipients";
import type { BeaconInsight, BeaconState, RecipientProfile as Profile } from "./types";

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
const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 60;

const CATEGORY_LABELS: Record<string, string> = {
  student: "Student",
  researcher: "Researcher",
  entrepreneur: "Entrepreneur",
  artist: "Artist",
  farmer: "Farmer",
  other: "Other"
};

function plural(count: number, word: string): string {
  return `${count.toLocaleString("en-CA")} ${word}${count === 1 ? "" : "s"}`;
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const url = safeUrl(href);
  if (!url) return <>{children}</>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  );
}

function moneyIn(unit: string) {
  const formatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: unit.length === 3 ? unit : "USD",
    notation: "compact",
    maximumFractionDigits: 1
  });
  return (value: number) => formatter.format(value);
}

function InsightBody({ state, insight }: { state: BeaconState; insight: BeaconInsight }) {
  const category = insight.person_category;
  const financials = insight.structured_financials;
  return (
    <div className="beacon-body">
      {insight.is_person && (
        <p className="beacon-category">
          <span className="badge">
            {CATEGORY_LABELS[category.category] ?? "Other"} · {category.confidence}% confidence
          </span>
          <span className="muted">Estimated. {category.reasoning}</span>
        </p>
      )}

      {insight.summary ? (
        <p className="beacon-summary">{insight.summary}</p>
      ) : insight.is_person ? (
        <p className="muted">
          No public source clearly matches this person, so Beacon shows only an estimate.
        </p>
      ) : (
        <p className="muted">No reliable public description was found.</p>
      )}

      {insight.funding_insights.length > 0 && (
        <>
          <h4>Why it may have received this funding</h4>
          <ul className="beacon-insights">
            {insight.funding_insights.map((item) => (
              <li key={item.insight}>
                {item.insight}
                <small>Based on: {item.basis}</small>
              </li>
            ))}
          </ul>
        </>
      )}

      {insight.public_company.is_public && (
        <p>
          Publicly traded: <strong>{insight.public_company.ticker}</strong>
          {insight.public_company.exchange ? ` on ${insight.public_company.exchange}` : ""}
        </p>
      )}

      {financials && financials.metrics.length > 0 && (
        <div className="beacon-financials">
          <h4>
            Annual figures from{" "}
            <ExternalLink href={financials.sourceUrl}>{financials.source}</ExternalLink>
          </h4>
          <div className="small-multiples">
            {financials.metrics.map((metric) => (
              <ColumnChart
                key={metric.label}
                title={`${metric.label} (${metric.unit})`}
                labelHeading="Fiscal year end"
                height={170}
                format={moneyIn(metric.unit)}
                formatAxis={moneyIn(metric.unit)}
                items={metric.values.map((item) => ({
                  key: item.periodEnd,
                  label: item.periodEnd.slice(0, 4),
                  value: item.value,
                  detail: `year ending ${item.periodEnd}`
                }))}
              />
            ))}
          </div>
        </div>
      )}

      {insight.financial_highlights.length > 0 && (
        <>
          <h4>Financial highlights (AI-gathered)</h4>
          <ul className="beacon-list">
            {insight.financial_highlights.map((item) => (
              <li key={`${item.label}-${item.period}`}>
                {item.label}: <strong>{item.value}</strong> ({item.period}){" "}
                <ExternalLink href={item.source_url}>source</ExternalLink>
              </li>
            ))}
          </ul>
        </>
      )}

      {insight.sources.length > 0 && (
        <>
          <h4>Sources</h4>
          <ul className="beacon-list">
            {insight.sources.map((source) => (
              <li key={source.url}>
                <ExternalLink href={source.url}>{source.title}</ExternalLink>
              </li>
            ))}
          </ul>
        </>
      )}

      {insight.caveats.length > 0 && (
        <ul className="beacon-caveats">
          {insight.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
        </ul>
      )}

      <p className="beacon-meta">
        {state.generatedAt
          ? `Generated ${new Date(state.generatedAt).toLocaleDateString("en-CA")}`
          : ""}
        {state.model ? ` with ${state.model}` : ""}
        {state.stale ? " · may be out of date" : ""}
      </p>
    </div>
  );
}

export function BeaconCard({ client, recipientId }: { client: BeaconClient; recipientId: string }) {
  const [state, setState] = useState<BeaconState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setState(null);
    setError(null);
    client
      .get(recipientId, controller.signal)
      .then(setState)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Beacon is unavailable");
      });
    return () => controller.abort();
  }, [client, recipientId]);

  useEffect(() => {
    if (state?.status !== "pending") return;
    if (polls.current >= MAX_POLLS) {
      setError("The summary is taking longer than expected. Check back later.");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      polls.current += 1;
      client.get(recipientId, controller.signal).then(setState).catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [client, recipientId, state]);

  async function generate() {
    setBusy(true);
    setError(null);
    polls.current = 0;
    try {
      setState(await client.request(recipientId));
    } catch (reason) {
      setError(reason instanceof BeaconError || reason instanceof Error ? reason.message : "Beacon is unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="beacon-card" aria-labelledby="beacon-title" aria-live="polite">
      <h3 id="beacon-title">Beacon insight <span className="badge badge-ai">AI</span></h3>
      {state && <p className="beacon-label">{state.label}</p>}
      {!state && !error && <p className="muted">Checking for a summary…</p>}
      {state?.status === "pending" && (
        <p className="muted">Searching public sources and writing a summary. This can take a minute.</p>
      )}
      {state?.status === "none" && !state.canGenerate && (
        <p className="muted">No summary has been generated for this recipient yet.</p>
      )}
      {state?.status === "failed" && !state.insight && (
        <p className="muted">The last attempt failed.</p>
      )}
      {state?.insight && <InsightBody state={state} insight={state.insight} />}
      {state?.canGenerate && (
        <button type="button" className="primary-button" disabled={busy} onClick={generate}>
          {state.insight ? "Refresh summary" : "Generate summary"}
        </button>
      )}
      {state?.canGenerate && !state.insight && (
        <p className="beacon-meta">Once generated, the summary is saved and shown to everyone.</p>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}

interface RecipientProfileProps {
  recipientId: string;
  dataClient: DataClient;
  beaconClient: BeaconClient | null;
  onClose: () => void;
}

export default function RecipientProfile({
  recipientId,
  dataClient,
  beaconClient,
  onClose
}: RecipientProfileProps) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setProfile(undefined);
    setError(null);
    dataClient
      .getRecipient(recipientId, controller.signal)
      .then(setProfile)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load recipient");
      });
    return () => controller.abort();
  }, [dataClient, recipientId]);

  if (error) return <p className="error-text" role="alert">{error}</p>;
  if (profile === undefined) return <p className="muted">Loading recipient…</p>;
  if (profile === null) return <p className="muted">This recipient could not be found.</p>;

  const years = continuousYears(profile.byYear);
  const largest = profile.largestAgreements[0];
  const firstYear = profile.firstAgreementStart?.slice(0, 4);
  const lastYear = profile.lastAgreementStart?.slice(0, 4);
  const maxDepartment = Math.max(1, ...profile.departments.map((item) => item.value));
  const location = profile.locations
    .map((item) => [item.city, item.province].filter(Boolean).join(", "))
    .find(Boolean);

  return (
    <div className="recipient-profile">
      <button type="button" className="text-button back-button" onClick={onClose}>← Back to grant</button>
      <p className="eyebrow">{profile.recipientTypeLabel ?? (profile.isPerson ? "Individual" : "Recipient")}</p>
      <h2 id="recipient-title">{profile.name}</h2>
      {location && <p className="muted">{location}</p>}
      {profile.otherNames.length > 0 && (
        <p className="muted">Also published as {profile.otherNames.join("; ")}</p>
      )}
      {profile.affiliation && (
        <p className="muted">
          Grants are filed under the business number of {profile.affiliation.name}.
        </p>
      )}
      {profile.isAggregate && (
        <p className="notice">
          This is not one recipient. Departments publish small or confidential grants
          together under this placeholder name.
        </p>
      )}

      <dl className="stat-tiles">
        <div><dt>Total received</dt><dd>{compactCurrency.format(profile.totalFunding)}</dd></div>
        <div><dt>Agreements</dt><dd>{profile.agreementCount.toLocaleString("en-CA")}</dd></div>
        <div>
          <dt>Years</dt>
          <dd>{firstYear ? (firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`) : "Undated"}</dd>
        </div>
        {largest && (
          <div><dt>Largest agreement</dt><dd>{compactCurrency.format(largest.agreement_value)}</dd></div>
        )}
      </dl>

      {years.length > 0 && (
        <ColumnChart
          title="Funding by agreement start year"
          labelHeading="Year"
          format={(value) => currency.format(value)}
          formatAxis={(value) => compactCurrency.format(value)}
          items={years.map((item) => ({
            key: String(item.year),
            label: String(item.year),
            value: item.value,
            detail: plural(item.count, "agreement")
          }))}
        />
      )}
      {profile.undated.count > 0 && (
        <p className="beacon-meta">
          Not shown: {currency.format(profile.undated.value)} in{" "}
          {plural(profile.undated.count, "agreement")} without a start date.
        </p>
      )}

      {profile.departments.length > 0 && (
        <>
          <h3>By department</h3>
          <ul className="bar-list">
            {profile.departments.map((item) => (
              <li key={item.name}>
                <span className="bar-label">{item.name}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(Math.max(0, item.value) / maxDepartment) * 100}%` }} />
                </span>
                <span className="bar-value">{compactCurrency.format(item.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {profile.programs.length > 0 && (
        <>
          <h3>Programs</h3>
          <ul className="plain-list">
            {profile.programs.map((item) => (
              <li key={item.name}>
                {item.name} <span className="muted">· {compactCurrency.format(item.value)} · {plural(item.count, "agreement")}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Largest agreements</h3>
      <ul className="plain-list">
        {profile.largestAgreements.map((agreement) => (
          <li key={agreement.record_id}>
            <strong>{currency.format(agreement.agreement_value)}</strong> {agreement.agreement_title}
            <span className="muted">
              {" "}· {agreement.department}
              {agreement.agreement_start_date ? ` · ${agreement.agreement_start_date.slice(0, 4)}` : ""}
            </span>
          </li>
        ))}
      </ul>

      {beaconClient && !profile.isAggregate && (
        <BeaconCard client={beaconClient} recipientId={profile.recipientId} />
      )}
    </div>
  );
}
