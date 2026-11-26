import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "./dataClient";
import { SampleDataClient } from "./dataClient";
import RecipientProfile from "./RecipientProfile";
import { similarFromGrants } from "./recipients";
import SimilarRecipients from "./SimilarRecipients";
import type { Grant, RecipientProfile as Profile } from "./types";

afterEach(cleanup);

function grant(id: string, recipient: string, name: string, value: number, program: string, person = false): Grant {
  return {
    record_id: id, recipient_name: name, agreement_title: "Project", agreement_value: value,
    agreement_start_date: "2024-01-01", agreement_end_date: null, province: "ON", city: "Toronto",
    department: "Dept", program_name: program, description: "", source_url: "https://example.ca",
    retrieved_at: "2026-01-01T00:00:00Z", recipient_id: recipient, recipient_is_person: person,
    recipient_is_aggregate: false, is_latest_amendment: true
  };
}

const grants = [
  grant("a1", "acme", "Acme Inc.", 2_000_000, "Clean Tech"),
  grant("a2", "acme", "Acme Inc.", 500_000, "Exports"),
  grant("b1", "beta", "Beta Corp", 3_000_000, "Clean Tech"),
  grant("b2", "beta", "Beta Corp", 100_000, "Exports"),
  grant("c1", "gamma", "Gamma Ltd", 50_000, "Clean Tech"),
  grant("d1", "delta", "Delta Farms", 900_000, "Farming"),
  grant("p1", "person", "Doe, Jane", 10_000, "Clean Tech", true)
];

describe("similar recipients", () => {
  it("ranks organizations by shared programs and leaves out people", () => {
    const similar = similarFromGrants(grants, "acme");

    expect(similar.map((item) => item.recipientId)).toEqual(["beta", "gamma"]);
    expect(similar[0].sharedPrograms).toEqual(["Clean Tech", "Exports"]);
    expect(similarFromGrants(grants, "person")).toEqual([]);
  });

  it("links each similar recipient to its profile", async () => {
    render(<SimilarRecipients dataClient={new SampleDataClient(async () => grants)} recipientId="acme" />);

    const link = await screen.findByRole("link", { name: "Beta Corp" });
    expect(link).toHaveAttribute("href", "/recipients/beta");
    expect(screen.getAllByText("Clean Tech").length).toBeGreaterThan(0);
  });

  it("shows the program rank tile and the size chart on a profile", async () => {
    const profile: Profile = {
      recipientId: "acme", name: "Acme Inc.", otherNames: [], isPerson: false, isAggregate: false,
      recipientType: "F", recipientTypeLabel: "For-profit organization", businessNumber: null, affiliation: null,
      locations: [], totalFunding: 2_500_000, agreementCount: 2, firstAgreementStart: "2024-01-01",
      lastAgreementStart: "2024-01-01", byYear: [{ year: 2024, value: 2_500_000, count: 2 }],
      undated: { value: 0, count: 0 }, departments: [], programs: [], largestAgreements: [],
      sizeBuckets: [
        { label: "Under $25K", count: 0, value: 0 },
        { label: "$100K to $1M", count: 1, value: 500_000 },
        { label: "$1M to $10M", count: 1, value: 2_000_000 }
      ],
      programRank: { program: "Clean Tech", rank: 2, recipients: 40, programTotal: 9_000_000, share: 0.22 }
    };
    const dataClient: DataClient = {
      queryGrants: vi.fn(),
      getRecipient: vi.fn(async () => profile),
      getSimilar: vi.fn(async () => [])
    };

    render(<RecipientProfile recipientId="acme" dataClient={dataClient} beaconClient={null} onClose={() => undefined} />);

    expect(await screen.findByText("Rank in main program")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("Agreements by size")).toBeInTheDocument();
  });
});
