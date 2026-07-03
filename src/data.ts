import type { FundingTotal, Grant, GrantFilters, RegionTotal } from "./types";

export const CANADIAN_REGIONS = [
  { code: "YT", name: "Yukon" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "BC", name: "British Columbia" },
  { code: "AB", name: "Alberta" },
  { code: "SK", name: "Saskatchewan" },
  { code: "MB", name: "Manitoba" },
  { code: "ON", name: "Ontario" },
  { code: "QC", name: "Quebec" },
  { code: "NB", name: "New Brunswick" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NL", name: "Newfoundland and Labrador" }
] as const;

const searchableFields: (keyof Grant)[] = [
  "recipient_name",
  "agreement_title",
  "program_name",
  "department",
  "description",
  "city",
  "province"
];

export async function loadGrants(): Promise<Grant[]> {
  const response = await fetch("./data/grants.sample.json");
  if (!response.ok) {
    throw new Error(`Could not load grant data (${response.status})`);
  }
  return response.json() as Promise<Grant[]>;
}

export function filterGrants(grants: Grant[], filters: GrantFilters): Grant[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return grants.filter((grant) => {
    const matchesQuery =
      !query ||
      searchableFields.some((field) =>
        String(grant[field] ?? "").toLocaleLowerCase().includes(query)
      );
    const matchesProvince =
      !filters.province || grant.province === filters.province;
    const matchesDepartment =
      !filters.department || grant.department === filters.department;

    return matchesQuery && matchesProvince && matchesDepartment;
  });
}

export function fundingByDepartment(grants: Grant[], limit = 6): FundingTotal[] {
  const totals = new Map<string, FundingTotal>();

  for (const grant of grants) {
    const current = totals.get(grant.department) ?? {
      name: grant.department,
      value: 0,
      count: 0
    };
    current.value += grant.agreement_value;
    current.count += 1;
    totals.set(grant.department, current);
  }

  return [...totals.values()]
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
}

export function fundingByRegion(grants: Grant[]): {
  regions: RegionTotal[];
  unknown: FundingTotal;
} {
  const totals = new Map<string, RegionTotal>(
    CANADIAN_REGIONS.map((region) => [
      region.code,
      { ...region, value: 0, count: 0 }
    ])
  );
  const unknown: FundingTotal = { name: "Unknown location", value: 0, count: 0 };

  for (const grant of grants) {
    const region = grant.province ? totals.get(grant.province) : undefined;
    const total = region ?? unknown;
    total.value += grant.agreement_value;
    total.count += 1;
  }

  return { regions: [...totals.values()], unknown };
}

export function uniqueValues(
  grants: Grant[],
  field: "province" | "department"
): string[] {
  return [...new Set(grants.map((grant) => grant[field]).filter(Boolean) as string[])]
    .sort((left, right) => left.localeCompare(right));
}
