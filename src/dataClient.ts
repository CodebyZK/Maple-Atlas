import {
  filterGrants,
  fundingByDepartment,
  fundingByLocation,
  fundingByRegion,
  loadGrants,
  sortGrants,
  uniqueValues
} from "./data";
import { profileFromGrants } from "./recipients";
import type {
  DatasetInfo,
  Grant,
  GrantQuery,
  GrantQueryResult,
  RecipientProfile
} from "./types";

export const DEFAULT_PAGE_SIZE = 25;

export interface DataClient {
  queryGrants(query: GrantQuery, signal?: AbortSignal): Promise<GrantQueryResult>;
  /** Everything one recipient received, or null when unknown or unsupported. */
  getRecipient(recipientId: string, signal?: AbortSignal): Promise<RecipientProfile | null>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRecipientProfile(value: unknown): value is RecipientProfile {
  if (!isObject(value)) return false;
  return typeof value.recipientId === "string"
    && typeof value.name === "string"
    && typeof value.isPerson === "boolean"
    && typeof value.totalFunding === "number"
    && typeof value.agreementCount === "number"
    && Array.isArray(value.byYear)
    && Array.isArray(value.departments)
    && Array.isArray(value.largestAgreements);
}

function isNullableString(value: unknown): boolean {
  return typeof value === "string" || value === null;
}

function isFundingTotal(value: unknown): boolean {
  return isObject(value)
    && typeof value.name === "string"
    && typeof value.value === "number"
    && typeof value.count === "number";
}

function isLocationTotal(value: unknown): boolean {
  return isFundingTotal(value)
    && isObject(value)
    && (typeof value.city === "string" || value.city === null)
    && (typeof value.province === "string" || value.province === null);
}

function isGrant(value: unknown): boolean {
  return isObject(value)
    && typeof value.record_id === "string"
    && typeof value.recipient_name === "string"
    && typeof value.agreement_title === "string"
    && typeof value.agreement_value === "number"
    && isNullableString(value.agreement_start_date)
    && isNullableString(value.agreement_end_date)
    && isNullableString(value.province)
    && isNullableString(value.city)
    && typeof value.department === "string"
    && isNullableString(value.program_name)
    && typeof value.description === "string"
    && typeof value.source_url === "string"
    && typeof value.retrieved_at === "string";
}

function isGrantQueryResult(value: unknown): value is GrantQueryResult {
  if (!isObject(value) || !isObject(value.dataset)) return false;

  return Array.isArray(value.records)
    && value.records.every(isGrant)
    && typeof value.page === "number"
    && typeof value.pageSize === "number"
    && typeof value.totalRecords === "number"
    && typeof value.totalPages === "number"
    && typeof value.totalFunding === "number"
    && typeof value.recipientCount === "number"
    && Array.isArray(value.departments)
    && value.departments.every(isFundingTotal)
    && Array.isArray(value.regions)
    && value.regions.every(
      (region) => isFundingTotal(region)
        && isObject(region)
        && typeof region.code === "string"
    )
    && Array.isArray(value.locations)
    && value.locations.every(isLocationTotal)
    && isFundingTotal(value.unknownRegion)
    && Array.isArray(value.provinceOptions)
    && value.provinceOptions.every((option) => typeof option === "string")
    && Array.isArray(value.departmentOptions)
    && value.departmentOptions.every((option) => typeof option === "string")
    && typeof value.dataset.version === "string"
    && typeof value.dataset.retrievedAt === "string"
    && typeof value.dataset.recordCount === "number"
    && typeof value.dataset.isSample === "boolean";
}

function datasetInfo(grants: Grant[]): DatasetInfo {
  const retrievedAt = grants.reduce(
    (latest, grant) => grant.retrieved_at > latest ? grant.retrieved_at : latest,
    ""
  );

  return {
    version: "development-sample",
    retrievedAt,
    recordCount: grants.length,
    isSample: true,
    latestAmendmentsOnly: grants.some(
      (grant) => grant.is_latest_amendment !== undefined
    )
  };
}

/**
 * Amendment rows restate an agreement's full value, so counting every row
 * would double-count amended agreements. Keep only the latest amendment.
 * Records from samples older than Forge schema 2.0.0 carry no flag and are kept.
 */
export function latestAmendments(grants: Grant[]): Grant[] {
  return grants.filter((grant) => grant.is_latest_amendment !== false);
}

export class SampleDataClient implements DataClient {
  private grantsPromise?: Promise<Grant[]>;

  constructor(
    private readonly load: () => Promise<Grant[]> = loadGrants
  ) {}

  private grants(): Promise<Grant[]> {
    if (!this.grantsPromise) {
      this.grantsPromise = this.load().then(latestAmendments, (error: unknown) => {
        this.grantsPromise = undefined;
        throw error;
      });
    }
    return this.grantsPromise;
  }

  async getRecipient(
    recipientId: string,
    signal?: AbortSignal
  ): Promise<RecipientProfile | null> {
    const grants = await this.grants();
    signal?.throwIfAborted();
    return profileFromGrants(grants, recipientId);
  }

  async queryGrants(
    query: GrantQuery,
    signal?: AbortSignal
  ): Promise<GrantQueryResult> {
    const grants = await this.grants();
    signal?.throwIfAborted();

    const unsortedFiltered = filterGrants(grants, query);
    const filtered = sortGrants(unsortedFiltered, query.sort);
    const mapRecords = filterGrants(grants, { ...query, province: "" });
    const regionalFunding = fundingByRegion(mapRecords);
    const totalPages = Math.max(1, Math.ceil(filtered.length / query.pageSize));
    const page = Math.min(Math.max(1, query.page), totalPages);
    const offset = (page - 1) * query.pageSize;

    return {
      records: filtered.slice(offset, offset + query.pageSize),
      page,
      pageSize: query.pageSize,
      totalRecords: filtered.length,
      totalPages,
      totalFunding: filtered.reduce(
        (sum, grant) => sum + grant.agreement_value,
        0
      ),
      recipientCount: new Set(
        filtered.map((grant) => grant.recipient_name)
      ).size,
      departments: fundingByDepartment(filtered),
      regions: regionalFunding.regions,
      locations: fundingByLocation(unsortedFiltered),
      unknownRegion: regionalFunding.unknown,
      provinceOptions: uniqueValues(grants, "province"),
      departmentOptions: uniqueValues(grants, "department"),
      dataset: datasetInfo(grants)
    };
  }
}

export class HttpDataClient implements DataClient {
  constructor(private readonly baseUrl: string) {}

  async getRecipient(
    recipientId: string,
    signal?: AbortSignal
  ): Promise<RecipientProfile | null> {
    const baseUrl = new URL(
      `${this.baseUrl.replace(/\/+$/, "")}/`,
      window.location.origin
    );
    const url = new URL(`recipients/${encodeURIComponent(recipientId)}`, baseUrl);
    const timeoutSignal = AbortSignal.timeout(15_000);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Could not load recipient (${response.status})`);
    }
    const payload: unknown = await response.json();
    if (!isRecipientProfile(payload)) {
      throw new Error("Grant data API returned an invalid recipient profile");
    }
    return payload;
  }

  async queryGrants(
    query: GrantQuery,
    signal?: AbortSignal
  ): Promise<GrantQueryResult> {
    const baseUrl = new URL(
      `${this.baseUrl.replace(/\/+$/, "")}/`,
      window.location.origin
    );
    const url = new URL("grants", baseUrl);
    const parameters = new URLSearchParams({
      query: query.query,
      search_mode: query.searchMode,
      search_field: query.searchField,
      province: query.province,
      department: query.department,
      date_field: query.dateField,
      sort: query.sort,
      page: String(query.page),
      page_size: String(query.pageSize)
    });
    if (query.startDate) parameters.set("start_date", query.startDate);
    if (query.endDate) parameters.set("end_date", query.endDate);
    if (query.minimumValue !== "") {
      parameters.set("minimum_value", query.minimumValue);
    }
    if (query.maximumValue !== "") {
      parameters.set("maximum_value", query.maximumValue);
    }
    url.search = parameters.toString();

    const timeoutSignal = AbortSignal.timeout(15_000);
    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: requestSignal
    });
    if (!response.ok) {
      throw new Error(`Could not query grant data (${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!isGrantQueryResult(payload)) {
      throw new Error("Grant data API returned an invalid response");
    }
    return payload;
  }
}

export function createDataClient(): DataClient {
  const apiUrl = import.meta.env.VITE_DATA_API_URL?.trim();
  return apiUrl ? new HttpDataClient(apiUrl) : new SampleDataClient();
}
