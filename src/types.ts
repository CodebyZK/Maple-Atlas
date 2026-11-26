export interface Grant {
  record_id: string;
  recipient_name: string;
  agreement_title: string;
  agreement_value: number;
  agreement_start_date: string | null;
  agreement_end_date: string | null;
  province: string | null;
  city: string | null;
  department: string;
  program_name: string | null;
  description: string;
  source_url: string;
  retrieved_at: string;
  /** Present from Forge schema 2.0.0. One agreement can have many amendments. */
  agreement_id?: string;
  reference_number?: string | null;
  amendment_number?: number;
  amendment_count?: number;
  /** Amendments restate the full value; only the latest one counts in totals. */
  is_latest_amendment?: boolean;
}

export interface GrantFilters {
  query: string;
  searchMode: GrantSearchMode;
  searchField: GrantSearchField;
  province: string;
  department: string;
  dateField: GrantDateField;
  startDate: string;
  endDate: string;
  minimumValue: string;
  maximumValue: string;
  sort: GrantSort;
}

export type GrantSearchMode = "all" | "any" | "phrase";

export type GrantSearchField =
  | "all"
  | "recipient"
  | "project"
  | "program"
  | "department"
  | "description"
  | "location";

export type GrantDateField = "start" | "end" | "active";

export type GrantSort =
  | "date_desc"
  | "date_asc"
  | "value_desc"
  | "value_asc";

export interface FundingTotal {
  name: string;
  value: number;
  count: number;
}

export interface RegionTotal extends FundingTotal {
  code: string;
}

export interface LocationTotal extends FundingTotal {
  city: string | null;
  province: string | null;
}

export interface GrantQuery extends GrantFilters {
  page: number;
  pageSize: number;
}

export interface DatasetInfo {
  version: string;
  retrievedAt: string;
  recordCount: number;
  isSample: boolean;
  latestAmendmentsOnly?: boolean;
}

export interface GrantQueryResult {
  records: Grant[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  totalFunding: number;
  recipientCount: number;
  departments: FundingTotal[];
  regions: RegionTotal[];
  locations: LocationTotal[];
  unknownRegion: FundingTotal;
  provinceOptions: string[];
  departmentOptions: string[];
  dataset: DatasetInfo;
}
