import type { GrantFilters } from "./types";

export const DEFAULT_FILTERS: GrantFilters = {
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
};

export interface SearchState {
  filters: GrantFilters;
  page: number;
}

/** Short, readable URL keys for each filter. */
const KEYS: Record<keyof GrantFilters, string> = {
  query: "q",
  searchMode: "match",
  searchField: "in",
  province: "province",
  department: "department",
  dateField: "date",
  startDate: "from",
  endDate: "to",
  minimumValue: "min",
  maximumValue: "max",
  sort: "sort"
};

const ALLOWED: Partial<Record<keyof GrantFilters, readonly string[]>> = {
  searchMode: ["all", "any", "phrase"],
  searchField: ["all", "recipient", "project", "program", "department", "description", "location"],
  dateField: ["start", "end", "active"],
  sort: ["date_desc", "date_asc", "value_desc", "value_asc"]
};

export function parseSearch(search: string): SearchState {
  const parameters = new URLSearchParams(search);
  const filters = { ...DEFAULT_FILTERS };
  for (const field of Object.keys(KEYS) as (keyof GrantFilters)[]) {
    const value = parameters.get(KEYS[field]);
    if (value === null) continue;
    const allowed = ALLOWED[field];
    if (allowed && !allowed.includes(value)) continue;
    (filters as Record<string, string>)[field] = value.slice(0, 300);
  }
  const page = Number.parseInt(parameters.get("page") ?? "1", 10);
  return { filters, page: Number.isFinite(page) && page > 1 ? page : 1 };
}

/** Only non-default values go in the URL, so links stay short. */
export function serializeSearch({ filters, page }: SearchState): string {
  const parameters = new URLSearchParams();
  for (const field of Object.keys(KEYS) as (keyof GrantFilters)[]) {
    const value = filters[field];
    if (value !== DEFAULT_FILTERS[field] && value !== "") {
      parameters.set(KEYS[field], value);
    }
  }
  if (page > 1) parameters.set("page", String(page));
  const text = parameters.toString();
  return text ? `?${text}` : "";
}
