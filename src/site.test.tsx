import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { firstPart, placeName } from "./format";
import { distinctNames } from "./RecipientProfile";
import { DEFAULT_FILTERS, parseSearch, serializeSearch } from "./searchState";

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
    retrieved_at: "2026-01-01T00:00:00Z",
    recipient_id: "rec-community",
    recipient_is_person: false,
    recipient_is_aggregate: false,
    is_latest_amendment: true
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
    retrieved_at: "2026-01-01T00:00:00Z",
    recipient_id: "rec-northern",
    recipient_is_person: false,
    recipient_is_aggregate: false,
    is_latest_amendment: true
  }
];

describe("search state in the URL", () => {
  it("round-trips non-default filters and the page", () => {
    const state = {
      filters: { ...DEFAULT_FILTERS, query: "clean energy", province: "ON", searchMode: "phrase" as const, minimumValue: "0" },
      page: 3
    };
    const search = serializeSearch(state);

    expect(search).toBe("?q=clean+energy&match=phrase&province=ON&min=0&page=3");
    expect(parseSearch(search)).toEqual(state);
    expect(serializeSearch({ filters: DEFAULT_FILTERS, page: 1 })).toBe("");
  });

  it("ignores unknown values and bad pages", () => {
    const parsed = parseSearch("?match=everything&sort=random&page=-4&in=recipient");

    expect(parsed.filters.searchMode).toBe("all");
    expect(parsed.filters.sort).toBe("date_desc");
    expect(parsed.filters.searchField).toBe("recipient");
    expect(parsed.page).toBe(1);
  });
});

describe("site", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => sample }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens a shared search link with its filters applied", async () => {
    window.history.replaceState(null, "", "/?q=climate");

    render(<App />);

    expect(await screen.findByText("Northern Research Lab")).toBeInTheDocument();
    expect(screen.queryByText("Community Group")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search recipients, programs, places or keywords")).toHaveValue("climate");
    expect(screen.getByRole("button", { name: /“climate”/ })).toBeInTheDocument();
  });

  it("updates results and the URL after typing pauses", async () => {
    render(<App />);
    await screen.findByText("Community Group");

    fireEvent.change(screen.getByPlaceholderText("Search recipients, programs, places or keywords"), {
      target: { value: "youth" }
    });

    await waitFor(() => expect(window.location.search).toBe("?q=youth"));
    await waitFor(() => expect(screen.queryByText("Northern Research Lab")).not.toBeInTheDocument());
  });

  it("runs an example search", async () => {
    render(<App />);
    await screen.findByText("Community Group");

    fireEvent.click(within(screen.getByLabelText("Example searches")).getByRole("button", { name: "wildfire" }));

    await waitFor(() => expect(window.location.search).toBe("?q=wildfire"));
    expect(await screen.findByText("No agreements match these filters.")).toBeInTheDocument();
  });

  it("navigates to the content pages from the header", async () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Main" });

    fireEvent.click(within(nav).getByRole("link", { name: "How it works" }));
    expect(await screen.findByRole("heading", { level: 1, name: /From government spreadsheet/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/how-it-works");
    expect(within(nav).getByRole("link", { name: "How it works" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(within(nav).getByRole("link", { name: "Data & methods" }));
    expect(await screen.findByRole("heading", { level: 1, name: "What the numbers mean" })).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("link", { name: "About" }));
    expect(await screen.findByRole("heading", { level: 1, name: "About Maple Atlas" })).toBeInTheDocument();
    expect(document.title).toBe("About · Maple Atlas");
  });

  it("shows a not-found page for unknown addresses", () => {
    window.history.replaceState(null, "", "/no-such-page");

    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "That page does not exist" })).toBeInTheDocument();
  });

  it("opens a recipient profile at its own address", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("link", { name: "Northern Research Lab" }));

    expect(window.location.pathname).toBe("/recipients/rec-northern");
    expect(await screen.findByRole("heading", { name: "Northern Research Lab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to search/ })).toBeInTheDocument();
  });
});


describe("place names", () => {
  it("shows the first part of bilingual values", () => {
    expect(firstPart("Edmonton|Edmonton")).toBe("Edmonton");
    expect(firstPart(" Montreal | Montréal ")).toBe("Montreal");
    expect(firstPart("|")).toBeNull();
    expect(placeName("Edmonton|Edmonton", "AB")).toBe("Edmonton, AB");
    expect(placeName(null, "YT")).toBe("YT");
  });
});


describe("recipient name variants", () => {
  it("hides variants that only differ by language, case or punctuation", () => {
    expect(
      distinctNames("University of Ottawa", [
        "UNIVERSITY OF OTTAWA",
        "University of Ottawa | Université d’Ottawa",
        "Ottawa U Research Office"
      ])
    ).toEqual(["Ottawa U Research Office"]);
  });
});
