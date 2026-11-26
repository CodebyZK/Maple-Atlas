import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeaconClient } from "./beaconClient";
import ColumnChart from "./ColumnChart";
import { SampleDataClient } from "./dataClient";
import RecipientProfile, { BeaconCard } from "./RecipientProfile";
import { continuousYears, profileFromGrants } from "./recipients";
import type { BeaconInsight, BeaconState, Grant } from "./types";

function grant(overrides: Partial<Grant>): Grant {
  return {
    record_id: "r",
    recipient_name: "Acme Inc.",
    agreement_title: "Project",
    agreement_value: 100,
    agreement_start_date: "2022-04-01",
    agreement_end_date: null,
    province: "ON",
    city: "Toronto",
    department: "Department A",
    program_name: "Fund",
    description: "Purpose",
    source_url: "https://example.ca/grants.csv",
    retrieved_at: "2026-01-01T00:00:00Z",
    recipient_id: "rec-acme",
    recipient_type: "F",
    business_number: "111111112",
    recipient_is_person: false,
    recipient_is_aggregate: false,
    is_latest_amendment: true,
    ...overrides
  };
}

afterEach(cleanup);

const grants = [
  grant({ record_id: "a1", agreement_value: 100, agreement_start_date: "2020-01-01" }),
  grant({ record_id: "a2", agreement_value: 300, agreement_start_date: "2022-06-01", department: "Department B", recipient_name: "ACME INCORPORATED" }),
  grant({ record_id: "a3", agreement_value: 50, agreement_start_date: null }),
  grant({ record_id: "a4", agreement_value: 999, is_latest_amendment: false }),
  grant({ record_id: "o1", recipient_id: "rec-other", recipient_name: "Other" })
];

describe("profileFromGrants", () => {
  it("aggregates one recipient's latest amendments", () => {
    const profile = profileFromGrants(grants.filter((item) => item.is_latest_amendment), "rec-acme");

    expect(profile?.name).toBe("Acme Inc.");
    expect(profile?.otherNames).toEqual(["ACME INCORPORATED"]);
    expect(profile?.totalFunding).toBe(450);
    expect(profile?.agreementCount).toBe(3);
    expect(profile?.byYear).toEqual([
      { year: 2020, value: 100, count: 1 },
      { year: 2022, value: 300, count: 1 }
    ]);
    expect(profile?.undated).toEqual({ value: 50, count: 1 });
    expect(profile?.departments[0].name).toBe("Department B");
    expect(profile?.recipientTypeLabel).toBe("For-profit organization");
    expect(profile?.businessNumber).toBe("111111112");
  });

  it("hides a person's business number and returns null for unknown recipients", () => {
    const person = profileFromGrants(
      [grant({ recipient_id: "p", recipient_is_person: true, recipient_type: "P" })],
      "p"
    );

    expect(person?.isPerson).toBe(true);
    expect(person?.businessNumber).toBeNull();
    expect(profileFromGrants(grants, "missing")).toBeNull();
  });

  it("fills years without funding so gaps are visible", () => {
    expect(continuousYears([
      { year: 2020, value: 1, count: 1 },
      { year: 2022, value: 2, count: 1 }
    ]).map((item) => [item.year, item.value])).toEqual([[2020, 1], [2021, 0], [2022, 2]]);
  });
});

describe("ColumnChart", () => {
  const items = [
    { key: "2020", label: "2020", value: 100, detail: "1 agreement" },
    { key: "2021", label: "2021", value: 0, detail: "0 agreements" }
  ];

  it("shows a tooltip on focus and offers a table view", () => {
    render(
      <ColumnChart title="Funding" items={items} labelHeading="Year" format={(v) => `$${v}`} formatAxis={(v) => `${v}`} />
    );

    fireEvent.focus(screen.getByLabelText("2020: $100, 1 agreement"));
    expect(screen.getByRole("status")).toHaveTextContent("$100");

    fireEvent.click(screen.getByRole("button", { name: "Show table" }));
    expect(screen.getByRole("table")).toHaveTextContent("2021");
    expect(screen.getByRole("table")).toHaveTextContent("$0");
  });
});

function insight(overrides: Partial<BeaconInsight> = {}): BeaconInsight {
  return {
    recipient_name: "Acme Inc.",
    is_person: false,
    identity_confirmed: true,
    identity_evidence: "",
    summary: "A manufacturer.",
    funding_insights: [{ insight: "Likely funded for its plant.", basis: "Program: Fund" }],
    person_category: { category: "not_applicable", confidence: 0, reasoning: "" },
    public_company: { is_public: true, ticker: "ACME", exchange: "TSX", confidence: 90 },
    financial_highlights: [],
    structured_financials: null,
    summary_source_urls: ["https://acme.example/about"],
    sources: [
      { title: "Company site", url: "https://acme.example/about", publisher: "Acme", note: "Describes the plant." },
      { title: "Plant opens", url: "https://www.cbc.ca/news/plant" }
    ],
    caveats: [],
    ...overrides
  };
}

function state(overrides: Partial<BeaconState>): BeaconState {
  return {
    recipientId: "rec-acme",
    status: "none",
    insight: null,
    generatedAt: null,
    model: null,
    stale: false,
    canGenerate: true,
    label: "AI-generated with web search.",
    ...overrides
  };
}

describe("BeaconCard", () => {
  it("generates, polls while pending, then shows the cached insight", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const responses = [
      state({ status: "pending", canGenerate: false }),
      state({ status: "ready", canGenerate: false, insight: insight(), generatedAt: "2026-11-26T00:00:00Z", model: "m" })
    ];
    const client: BeaconClient = {
      get: vi.fn()
        .mockResolvedValueOnce(state({}))
        .mockImplementation(async () => responses[1]),
      request: vi.fn(async () => responses[0])
    };

    render(<BeaconCard client={client} recipientId="rec-acme" />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate summary" }));
    expect(await screen.findByText(/Searching public sources/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(await screen.findByText("A manufacturer.")).toBeInTheDocument();
    expect(screen.getByText("Likely funded for its plant.")).toBeInTheDocument();
    expect(screen.getByText("ACME")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Company site" })).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(screen.getByText("Read the articles")).toBeInTheDocument();
    expect(screen.getByText("Describes the plant.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "[1] Acme" })).toHaveAttribute("href", "https://acme.example/about");
    expect(screen.queryByRole("link", { name: "[2] cbc.ca" })).toBeNull();
    expect(screen.getByText("[2] cbc.ca")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Read article ↗" })).toHaveLength(2);
    expect(client.request).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("shows a person's estimate and never renders model text as HTML", async () => {
    const client: BeaconClient = {
      get: vi.fn(async () =>
        state({
          status: "ready",
          canGenerate: false,
          insight: insight({
            is_person: true,
            summary: "",
            public_company: { is_public: false, ticker: "", exchange: "", confidence: 0 },
            person_category: { category: "researcher", confidence: 64, reasoning: "<img src=x onerror=alert(1)>" },
            sources: [{ title: "Bad link", url: "javascript:alert(1)" }]
          })
        })
      ),
      request: vi.fn()
    };

    const { container } = render(<BeaconCard client={client} recipientId="rec-person" />);

    expect(await screen.findByText(/Researcher · 64% confidence/)).toBeInTheDocument();
    expect(screen.getByText(/No public source clearly matches/)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("link", { name: "Bad link" })).toBeNull();
  });

  it("shows the limit message from Beacon", async () => {
    const { BeaconError } = await import("./beaconClient");
    const client: BeaconClient = {
      get: vi.fn(async () => state({})),
      request: vi.fn(async () => {
        throw new BeaconError("You have reached today's limit for new summaries.");
      })
    };

    render(<BeaconCard client={client} recipientId="rec-acme" />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate summary" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("today's limit");
  });
});

describe("RecipientProfile", () => {
  it("renders totals, the yearly chart and no Beacon card without a client", async () => {
    const dataClient = new SampleDataClient(async () => grants);

    render(<RecipientProfile recipientId="rec-acme" dataClient={dataClient} beaconClient={null} onClose={() => undefined} />);

    expect(await screen.findByRole("heading", { name: "Acme Inc." })).toBeInTheDocument();
    expect(screen.getByText("Funding by agreement start year")).toBeInTheDocument();
    expect(screen.getByText(/without a start date/)).toBeInTheDocument();
    expect(screen.queryByText(/Beacon insight/)).toBeNull();
    await waitFor(() => expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0));
  });

  it("explains placeholders and hides Beacon for them", async () => {
    const dataClient = new SampleDataClient(async () => [
      grant({ recipient_id: "batch", recipient_name: "Batch report", recipient_is_aggregate: true })
    ]);
    const beaconClient: BeaconClient = { get: vi.fn(), request: vi.fn() };

    render(<RecipientProfile recipientId="batch" dataClient={dataClient} beaconClient={beaconClient} onClose={() => undefined} />);

    expect(await screen.findByText(/This is not one recipient/)).toBeInTheDocument();
    expect(beaconClient.get).not.toHaveBeenCalled();
  });
});

describe("review fixes", () => {
  it("ignores superseded amendments even when callers pass them", () => {
    const profile = profileFromGrants(grants, "rec-acme");

    expect(profile?.totalFunding).toBe(450);
    expect(profile?.largestAgreements.map((item) => item.record_id)).not.toContain("a4");
  });

  it("keeps polling Beacon after a failed poll", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const ready = state({ status: "ready", canGenerate: false, insight: insight() });
    const client: BeaconClient = {
      get: vi.fn()
        .mockResolvedValueOnce(state({ status: "pending", canGenerate: false }))
        .mockRejectedValueOnce(new Error("network blip"))
        .mockResolvedValue(ready),
      request: vi.fn()
    };

    render(<BeaconCard client={client} recipientId="rec-acme" />);
    expect(await screen.findByText(/Searching public sources/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });

    expect(await screen.findByText("A manufacturer.")).toBeInTheDocument();
    expect(client.get).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
