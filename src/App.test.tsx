import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const sample = [
  {
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
    source_url: "https://example.ca/community",
    retrieved_at: "2026-01-01T00:00:00Z"
  },
  {
    record_id: "grant-2",
    recipient_name: "Northern Research Lab",
    agreement_title: "Climate research",
    agreement_value: 75000,
    agreement_start_date: "2025-02-01",
    agreement_end_date: "2025-12-31",
    province: "YT",
    city: "Whitehorse",
    department: "Department B",
    program_name: "Research Fund",
    description: "Northern climate research.",
    source_url: "https://example.ca/research",
    retrieved_at: "2026-01-01T00:00:00Z"
  }
];

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sample
    }));
  });

  it("loads and presents Forge records", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Community Group")).toBeInTheDocument());
    expect(screen.getAllByText("$200,000")).toHaveLength(1);
  });

  it("filters records by search, province, and department", async () => {
    render(<App />);
    await screen.findByText("Community Group");

    fireEvent.change(
      screen.getByPlaceholderText("Search recipients, projects, programs, or places"),
      { target: { value: "research" } }
    );
    expect(screen.queryByText("Community Group")).not.toBeInTheDocument();
    expect(screen.getByText("Northern Research Lab")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Ontario: $0.0, 0 agreements"
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.change(screen.getByLabelText("Province or territory"), {
      target: { value: "ON" }
    });
    expect(screen.getByText("Community Group")).toBeInTheDocument();
    expect(screen.queryByText("Northern Research Lab")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "Department B" }
    });
    expect(screen.queryByText("Community Group")).not.toBeInTheDocument();
    expect(screen.getByText("Northern Research Lab")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Ontario: $0.0, 0 agreements"
      })
    ).toBeInTheDocument();
  });

  it("opens the detail dialog and dismisses it with Escape", async () => {
    render(<App />);
    const recipient = await screen.findByText("Community Group");

    fireEvent.click(recipient.closest("button")!);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
    expect(within(dialog).getByText("Local programming")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "View source data ↗" }))
      .toHaveAttribute("href", "https://example.ca/community");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters records when a map region is selected", async () => {
    render(<App />);
    await screen.findByText("Community Group");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Yukon: $75.0K, 1 agreements"
      })
    );

    expect(screen.queryByText("Community Group")).not.toBeInTheDocument();
    expect(screen.getByText("Northern Research Lab")).toBeInTheDocument();
    expect(screen.getByLabelText("Province or territory")).toHaveValue("YT");
  });

  it("shows a useful error when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("Data service unavailable"));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Data service unavailable"
    );
  });
});
