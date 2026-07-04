import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpDataClient, SampleDataClient } from "./dataClient";
import type { Grant, GrantQueryResult } from "./types";

const query = {
  query: "",
  province: "",
  department: "",
  startDate: "",
  endDate: "",
  minimumValue: "",
  sort: "date_desc" as const,
  page: 1,
  pageSize: 1
};

const grants: Grant[] = [
  {
    record_id: "grant-1",
    recipient_name: "Community Group",
    agreement_title: "Youth program",
    agreement_value: 100,
    agreement_start_date: "2025-01-01",
    agreement_end_date: null,
    province: "ON",
    city: "Ottawa",
    department: "Department A",
    program_name: "Community Fund",
    description: "Local programming",
    source_url: "https://example.ca/1",
    retrieved_at: "2026-01-01T00:00:00Z"
  },
  {
    record_id: "grant-2",
    recipient_name: "Northern Lab",
    agreement_title: "Climate research",
    agreement_value: 400,
    agreement_start_date: "2025-01-01",
    agreement_end_date: null,
    province: "YT",
    city: "Whitehorse",
    department: "Department B",
    program_name: "Research Fund",
    description: "Northern research",
    source_url: "https://example.ca/2",
    retrieved_at: "2026-02-01T00:00:00Z"
  }
];

const apiResponse: GrantQueryResult = {
  records: [],
  page: 1,
  pageSize: 25,
  totalRecords: 0,
  totalPages: 1,
  totalFunding: 0,
  recipientCount: 0,
  departments: [],
  regions: [],
  unknownRegion: { name: "Unknown location", value: 0, count: 0 },
  provinceOptions: [],
  departmentOptions: [],
  dataset: {
    version: "2026-07-04",
    retrievedAt: "2026-07-04T00:00:00Z",
    recordCount: 1_264_036,
    isSample: false
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SampleDataClient", () => {
  it("returns bounded pages with global aggregates and lineage", async () => {
    const client = new SampleDataClient(async () => grants);
    const result = await client.queryGrants(query);

    expect(result.records).toHaveLength(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalRecords).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.totalFunding).toBe(500);
    expect(result.regions).toHaveLength(13);
    expect(result.dataset).toMatchObject({
      version: "development-sample",
      recordCount: 2,
      retrievedAt: "2026-02-01T00:00:00Z",
      isSample: true
    });
  });

  it("rejects an aborted query before processing records", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      new SampleDataClient(async () => grants).queryGrants(query, controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("retries loading after an initial failure", async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce(grants);
    const client = new SampleDataClient(load);

    await expect(client.queryGrants(query)).rejects.toThrow("Temporary failure");
    await expect(client.queryGrants(query)).resolves.toMatchObject({
      totalRecords: 2
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("HttpDataClient", () => {
  it("serializes filters and pagination for the data API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => apiResponse
    });
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await new HttpDataClient("https://data.example/v1").queryGrants(
      {
        query: "climate research",
        province: "YT",
        department: "Department B",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        minimumValue: "100",
        sort: "value_desc",
        page: 3,
        pageSize: 25
      },
      controller.signal
    );

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://data.example/v1/grants?query=climate+research&province=YT&department=Department+B&sort=value_desc&page=3&page_size=25&start_date=2025-01-01&end_date=2025-12-31&minimum_value=100"
    );
    expect(options.signal).not.toBe(controller.signal);
    controller.abort();
    expect(options.signal.aborted).toBe(true);
    expect(result).toBe(apiResponse);
  });

  it("rejects a response that does not match the API contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] })
    }));

    await expect(
      new HttpDataClient("https://data.example/v1").queryGrants(query)
    ).rejects.toThrow("Grant data API returned an invalid response");
  });
});
