import { useEffect, useState } from "react";
import type { DataClient } from "./dataClient";
import { firstPart } from "./format";
import { Link } from "./router";
import type { SimilarRecipient } from "./types";

const compactCurrency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1
});

/**
 * Organizations funded by the same programs. Computed from the grant data by
 * the Data API, so it costs nothing per view and needs no AI.
 */
export default function SimilarRecipients({
  dataClient,
  recipientId
}: {
  dataClient: DataClient;
  recipientId: string;
}) {
  const [similar, setSimilar] = useState<SimilarRecipient[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setSimilar(null);
    setFailed(false);
    dataClient
      .getSimilar(recipientId, controller.signal)
      .then(setSimilar)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [dataClient, recipientId]);

  if (failed) return null;
  if (similar === null) return <p className="muted">Finding similar recipients…</p>;
  if (similar.length === 0) return null;

  return (
    <section className="similar" aria-labelledby="similar-title">
      <h3 id="similar-title">Funded by the same programs</h3>
      <p className="muted">
        Organizations that received funding from this recipient's main programs, most overlap first.
      </p>
      <ul className="similar-list">
        {similar.map((item) => (
          <li key={item.recipientId} className="similar-card">
            <Link to={`/recipients/${encodeURIComponent(item.recipientId)}`} className="similar-name">
              {firstPart(item.name) ?? item.name}
            </Link>
            <span className="similar-meta">
              {[item.recipientTypeLabel, item.province].filter(Boolean).join(" · ")}
              {item.recipientTypeLabel || item.province ? " · " : ""}
              {compactCurrency.format(item.totalFunding)} total
            </span>
            <span className="similar-programs">
              {item.sharedPrograms.slice(0, 3).map((program) => (
                <span key={program} className="program-chip">{program}</span>
              ))}
              {item.sharedPrograms.length > 3 && (
                <span className="program-chip">+{item.sharedPrograms.length - 3} more</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
