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
}

export interface GrantFilters {
  query: string;
  province: string;
  department: string;
  startDate: string;
  endDate: string;
  minimumValue: string;
  sort: GrantSort;
}

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

export interface GrantQuery extends GrantFilters {
  page: number;
  pageSize: number;
}

export interface DatasetInfo {
  version: string;
  retrievedAt: string;
  recordCount: number;
  isSample: boolean;
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
  unknownRegion: FundingTotal;
  provinceOptions: string[];
  departmentOptions: string[];
  dataset: DatasetInfo;
}
