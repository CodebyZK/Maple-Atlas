import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const sample = [{
  record_id: "grant-1",
  recipient_name: "Community Group",
  agreement_title: "Youth program",
  agreement_value: 125000,
  agreement_start_date: "2025-01-01",
  agreement_end_date: null,
  province: "ON",
  city: "Ottawa",
  department: "Department A",
  program_name: "Community Fund",
  description: "Local programming",
  source_url: "https://example.ca",
  retrieved_at: "2026-01-01T00:00:00Z"
}];

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sample
    }));
  });

  it("loads and presents Forge records", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Community Group")).toBeInTheDocument());
    expect(screen.getAllByText("$125,000")).toHaveLength(3);
  });
});
