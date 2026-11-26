import type { Grant, ProfileAgreement, RecipientProfile } from "./types";

const RECIPIENT_TYPES: Record<string, string> = {
  A: "Indigenous recipient",
  F: "For-profit organization",
  G: "Government",
  I: "International organization",
  N: "Not-for-profit organization or charity",
  O: "Other",
  P: "Individual",
  S: "Academic institution"
};

function mode<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function totalsBy(grants: Grant[], key: (grant: Grant) => string | null, limit: number) {
  const totals = new Map<string, { name: string; value: number; count: number }>();
  for (const grant of grants) {
    const name = key(grant);
    if (!name) continue;
    const total = totals.get(name) ?? { name, value: 0, count: 0 };
    total.value += grant.agreement_value;
    total.count += 1;
    totals.set(name, total);
  }
  return [...totals.values()]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function asAgreement(grant: Grant): ProfileAgreement {
  return {
    record_id: grant.record_id,
    agreement_id: grant.agreement_id,
    agreement_title: grant.agreement_title,
    agreement_value: grant.agreement_value,
    agreement_start_date: grant.agreement_start_date,
    agreement_end_date: grant.agreement_end_date,
    department: grant.department,
    program_name: grant.program_name,
    description: grant.description,
    amendment_number: grant.amendment_number,
    amendment_count: grant.amendment_count
  };
}

/**
 * Build a recipient profile from already-loaded grants (latest amendments only).
 * Mirrors the Data API's /recipients/{id} response for the sample fallback.
 */
export function profileFromGrants(
  allGrants: Grant[],
  recipientId: string
): RecipientProfile | null {
  const grants = allGrants.filter((grant) => grant.recipient_id === recipientId);
  if (grants.length === 0) return null;

  const isPerson = grants.some((grant) => grant.recipient_is_person);
  const names = totalsBy(grants, (grant) => grant.recipient_name, 5)
    .sort((a, b) =>
      b.count - a.count
      // On a tie, prefer a mixed-case spelling over ALL CAPS.
      || Number(a.name === a.name.toUpperCase()) - Number(b.name === b.name.toUpperCase())
      || a.name.localeCompare(b.name))
    .map((item) => item.name);
  const dated = grants.filter((grant) => grant.agreement_start_date);
  const undated = grants.filter((grant) => !grant.agreement_start_date);
  const starts = dated.map((grant) => grant.agreement_start_date as string).sort();
  const years = new Map<number, { year: number; value: number; count: number }>();
  for (const grant of dated) {
    const year = Number((grant.agreement_start_date as string).slice(0, 4));
    const total = years.get(year) ?? { year, value: 0, count: 0 };
    total.value += grant.agreement_value;
    total.count += 1;
    years.set(year, total);
  }
  const kind = mode(grants.map((grant) => grant.recipient_type ?? null).filter(Boolean)) as
    | string
    | null;

  return {
    recipientId,
    name: names[0],
    otherNames: names.slice(1),
    isPerson,
    isAggregate: grants.some((grant) => grant.recipient_is_aggregate),
    recipientType: kind,
    recipientTypeLabel: kind ? RECIPIENT_TYPES[kind] ?? null : null,
    businessNumber: isPerson
      ? null
      : mode(grants.map((grant) => grant.business_number ?? null).filter(Boolean)) as string | null,
    affiliation: null,
    locations: totalsBy(
      grants,
      (grant) => [grant.city, grant.province].filter(Boolean).join("|") || null,
      5
    ).map((item) => {
      const [city, province] = item.name.split("|");
      return { city: city || null, province: province || null, count: item.count };
    }),
    totalFunding: grants.reduce((sum, grant) => sum + grant.agreement_value, 0),
    agreementCount: grants.length,
    firstAgreementStart: starts[0] ?? null,
    lastAgreementStart: starts[starts.length - 1] ?? null,
    byYear: [...years.values()].sort((a, b) => a.year - b.year),
    undated: {
      value: undated.reduce((sum, grant) => sum + grant.agreement_value, 0),
      count: undated.length
    },
    departments: totalsBy(grants, (grant) => grant.department, 8),
    programs: totalsBy(grants, (grant) => grant.program_name, 8),
    largestAgreements: [...grants]
      .sort((a, b) => b.agreement_value - a.agreement_value || a.record_id.localeCompare(b.record_id))
      .slice(0, 10)
      .map(asAgreement)
  };
}

/**
 * Every calendar year between the first and last funded year, with zero for
 * years that received nothing, so gaps in funding are visible on the chart.
 */
export function continuousYears(byYear: RecipientProfile["byYear"]) {
  if (byYear.length === 0) return [];
  const found = new Map(byYear.map((item) => [item.year, item]));
  const first = byYear[0].year;
  const last = byYear[byYear.length - 1].year;
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const year = first + index;
    return found.get(year) ?? { year, value: 0, count: 0 };
  });
}
