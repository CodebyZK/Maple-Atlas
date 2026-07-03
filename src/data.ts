import type { FundingTotal, Grant, GrantFilters } from "./types";

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

export function uniqueValues(
  grants: Grant[],
  field: "province" | "department"
): string[] {
  return [...new Set(grants.map((grant) => grant[field]).filter(Boolean) as string[])]
    .sort((left, right) => left.localeCompare(right));
}
