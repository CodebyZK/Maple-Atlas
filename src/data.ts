import type {
  FundingTotal,
  Grant,
  GrantFilters,
  GrantSort,
  RegionTotal
} from "./types";

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
  const minimumValue = filters.minimumValue === ""
    ? null
    : Number(filters.minimumValue);

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
    const matchesStartDate =
      !filters.startDate ||
      (grant.agreement_start_date !== null
        && grant.agreement_start_date >= filters.startDate);
    const matchesEndDate =
      !filters.endDate ||
      (grant.agreement_start_date !== null
        && grant.agreement_start_date <= filters.endDate);
    const matchesMinimumValue =
      minimumValue === null ||
      !Number.isFinite(minimumValue) ||
      grant.agreement_value >= minimumValue;

    return matchesQuery
      && matchesProvince
      && matchesDepartment
      && matchesStartDate
      && matchesEndDate
      && matchesMinimumValue;
  });
}

export function sortGrants(grants: Grant[], sort: GrantSort): Grant[] {
  return [...grants].sort((left, right) => {
    let comparison = 0;

    if (sort === "value_desc" || sort === "value_asc") {
      comparison = left.agreement_value - right.agreement_value;
      if (sort === "value_desc") comparison *= -1;
    } else {
      const leftDate = left.agreement_start_date;
      const rightDate = right.agreement_start_date;
      if (leftDate === null && rightDate !== null) return 1;
      if (leftDate !== null && rightDate === null) return -1;
      comparison = (leftDate ?? "").localeCompare(rightDate ?? "");
      if (sort === "date_desc") comparison *= -1;
    }

    return comparison || left.record_id.localeCompare(right.record_id);
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
  missing: FundingTotal;
  unrecognized: FundingTotal;
} {
  const totals = new Map<string, RegionTotal>(
    CANADIAN_REGIONS.map((region) => [
      region.code,
      { ...region, value: 0, count: 0 }
    ])
  );
  const unknown: FundingTotal = { name: "Unknown location", value: 0, count: 0 };
  const missing: FundingTotal = { name: "Missing location", value: 0, count: 0 };
  const unrecognized: FundingTotal = {
    name: "Unrecognized location",
    value: 0,
    count: 0
  };

  for (const grant of grants) {
    if (!grant.province) {
      missing.value += grant.agreement_value;
      missing.count += 1;
      unknown.value += grant.agreement_value;
      unknown.count += 1;
      continue;
    }

    const region = totals.get(grant.province);
    if (!region) {
      unrecognized.value += grant.agreement_value;
      unrecognized.count += 1;
      unknown.value += grant.agreement_value;
      unknown.count += 1;
      continue;
    }

    region.value += grant.agreement_value;
    region.count += 1;
  }

  return { regions: [...totals.values()], unknown, missing, unrecognized };
}

export function uniqueValues(
  grants: Grant[],
  field: "province" | "department"
): string[] {
  return [...new Set(grants.map((grant) => grant[field]).filter(Boolean) as string[])]
    .sort((left, right) => left.localeCompare(right));
}
