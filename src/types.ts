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
  /** Present from Forge schema 2.1.0. Groups every grant to one recipient. */
  recipient_id?: string;
  recipient_type?: string | null;
  business_number?: string | null;
  recipient_is_person?: boolean;
  recipient_is_aggregate?: boolean;
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

export interface YearTotal {
  year: number;
  value: number;
  count: number;
}

export interface ProfileAgreement {
  record_id: string;
  agreement_id?: string;
  agreement_title: string;
  agreement_value: number;
  agreement_start_date: string | null;
  agreement_end_date: string | null;
  department: string;
  program_name: string | null;
  description: string | null;
  amendment_number?: number;
  amendment_count?: number;
}

export interface RecipientProfile {
  recipientId: string;
  name: string;
  otherNames: string[];
  isPerson: boolean;
  /** Placeholder rows such as "Batch report" that group many recipients. */
  isAggregate: boolean;
  recipientType: string | null;
  recipientTypeLabel: string | null;
  businessNumber: string | null;
  /** For people: the institution whose business number their grants use. */
  affiliation: { name: string; businessNumber: string; agreementCount: number } | null;
  locations: { city: string | null; province: string | null; count: number }[];
  totalFunding: number;
  agreementCount: number;
  firstAgreementStart: string | null;
  lastAgreementStart: string | null;
  byYear: YearTotal[];
  undated: { value: number; count: number };
  departments: FundingTotal[];
  programs: FundingTotal[];
  largestAgreements: ProfileAgreement[];
  /** The recipient's CRA charity return, when it is a registered charity. */
  charity?: CharityInfo | null;
  /** Agreements and value by size range. */
  sizeBuckets?: { label: string; count: number; value: number }[];
  /** Position among everyone funded by the recipient's main program. */
  programRank?: {
    program: string;
    rank: number;
    recipients: number;
    programTotal: number;
    share: number;
  } | null;
}

/** An organization funded by the same programs (computed from grant data). */
export interface SimilarRecipient {
  recipientId: string;
  name: string;
  province: string | null;
  recipientTypeLabel: string | null;
  sharedPrograms: string[];
  sharedValue: number;
  totalFunding: number;
  agreementCount: number;
}

/** Amounts are null when the charity did not report them (never zero). */
export interface CharityInfo {
  registrationNumber: string;
  legalName: string;
  designation: string | null;
  category: string | null;
  city: string | null;
  province: string | null;
  fiscalPeriodEnd: string | null;
  sectionUsed: string | null;
  listYear: string;
  amounts: {
    revenue_federal: number | null;
    revenue_provincial: number | null;
    revenue_municipal: number | null;
    revenue_government_total: number | null;
    total_revenue: number | null;
    charitable_programs: number | null;
    management_and_administration: number | null;
    fundraising: number | null;
    total_expenditures: number | null;
    total_assets: number | null;
    total_liabilities: number | null;
  };
  source: string;
  sourceUrl: string;
}

export interface FinancialMetric {
  label: string;
  concept: string;
  unit: string;
  values: { periodEnd: string; value: number }[];
}

export interface BeaconInsight {
  recipient_name: string;
  is_person: boolean;
  identity_confirmed: boolean;
  identity_evidence: string;
  summary: string;
  funding_insights: { insight: string; basis: string }[];
  person_category: { category: string; confidence: number; reasoning: string };
  public_company: { is_public: boolean; ticker: string; exchange: string; confidence: number };
  financial_highlights: { label: string; value: string; period: string; source_url: string }[];
  structured_financials: {
    source: string;
    sourceUrl: string;
    ticker: string;
    companyName: string;
    metrics: FinancialMetric[];
  } | null;
  /** publisher and note are present from Beacon prompt version 2. */
  sources: { title: string; url: string; publisher?: string; note?: string }[];
  /** URLs from sources that support the summary (prompt version 2). */
  summary_source_urls?: string[];
  caveats: string[];
}

export type BeaconStatus = "none" | "pending" | "ready" | "failed";

export interface BeaconState {
  recipientId: string;
  status: BeaconStatus;
  insight: BeaconInsight | null;
  generatedAt: string | null;
  model: string | null;
  stale: boolean;
  canGenerate: boolean;
  label: string;
}
