import {
  filterGrants,
  fundingByDepartment,
  fundingByRegion,
  loadGrants,
  uniqueValues
} from "./data";
import type {
  DatasetInfo,
  Grant,
  GrantQuery,
  GrantQueryResult
} from "./types";

export const DEFAULT_PAGE_SIZE = 25;

export interface DataClient {
  queryGrants(query: GrantQuery, signal?: AbortSignal): Promise<GrantQueryResult>;
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
    isSample: true
  };
}

export class SampleDataClient implements DataClient {
  private grantsPromise?: Promise<Grant[]>;

  constructor(
    private readonly load: () => Promise<Grant[]> = loadGrants
  ) {}

  private grants(): Promise<Grant[]> {
    this.grantsPromise ??= this.load();
    return this.grantsPromise;
  }

  async queryGrants(
    query: GrantQuery,
    signal?: AbortSignal
  ): Promise<GrantQueryResult> {
    const grants = await this.grants();
    signal?.throwIfAborted();

    const filtered = filterGrants(grants, query);
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
      unknownRegion: regionalFunding.unknown,
      provinceOptions: uniqueValues(grants, "province"),
      departmentOptions: uniqueValues(grants, "department"),
      dataset: datasetInfo(grants)
    };
  }
}

export class HttpDataClient implements DataClient {
  constructor(private readonly baseUrl: string) {}

  async queryGrants(
    query: GrantQuery,
    signal?: AbortSignal
  ): Promise<GrantQueryResult> {
    const baseUrl = new URL(
      `${this.baseUrl.replace(/\/+$/, "")}/`,
      window.location.origin
    );
    const url = new URL("grants", baseUrl);
    url.search = new URLSearchParams({
      query: query.query,
      province: query.province,
      department: query.department,
      page: String(query.page),
      page_size: String(query.pageSize)
    }).toString();

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal
    });
    if (!response.ok) {
      throw new Error(`Could not query grant data (${response.status})`);
    }

    return response.json() as Promise<GrantQueryResult>;
  }
}

export function createDataClient(): DataClient {
  const apiUrl = import.meta.env.VITE_DATA_API_URL?.trim();
  return apiUrl ? new HttpDataClient(apiUrl) : new SampleDataClient();
}
