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
}

export interface FundingTotal {
  name: string;
  value: number;
  count: number;
}

export interface RegionTotal extends FundingTotal {
  code: string;
}
