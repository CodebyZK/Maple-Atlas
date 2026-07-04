import { describe, expect, it, vi } from "vitest";
import { HttpDataClient, SampleDataClient } from "./dataClient";
import type { Grant, GrantQueryResult } from "./types";

const query = {
  query: "",
  province: "",
  department: "",
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
});

describe("HttpDataClient", () => {
  it("serializes filters and pagination for the data API", async () => {
    const response = { records: [] } as unknown as GrantQueryResult;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => response
    });
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const result = await new HttpDataClient("https://data.example/v1").queryGrants(
      {
        query: "climate research",
        province: "YT",
        department: "Department B",
        page: 3,
        pageSize: 25
      },
      controller.signal
    );

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://data.example/v1/grants?query=climate+research&province=YT&department=Department+B&page=3&page_size=25"
    );
    expect(options.signal).toBe(controller.signal);
    expect(result).toBe(response);

    vi.unstubAllGlobals();
  });
});
