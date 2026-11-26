import type { BeaconState } from "./types";

export class BeaconError extends Error {}

export interface BeaconClient {
  get(recipientId: string, signal?: AbortSignal): Promise<BeaconState>;
  request(recipientId: string, signal?: AbortSignal): Promise<BeaconState>;
}

function isBeaconState(value: unknown): value is BeaconState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return typeof state.recipientId === "string"
    && ["none", "pending", "ready", "failed"].includes(String(state.status))
    && typeof state.canGenerate === "boolean"
    && typeof state.label === "string";
}

export class HttpBeaconClient implements BeaconClient {
  constructor(private readonly baseUrl: string) {}

  private url(recipientId: string): URL {
    const base = new URL(`${this.baseUrl.replace(/\/+$/, "")}/`, window.location.origin);
    return new URL(`insights/${encodeURIComponent(recipientId)}`, base);
  }

  private async send(recipientId: string, method: "GET" | "POST", signal?: AbortSignal) {
    const timeout = AbortSignal.timeout(15_000);
    const response = await fetch(this.url(recipientId), {
      method,
      headers: { Accept: "application/json" },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof payload === "object" && payload !== null
        ? (payload as { detail?: unknown }).detail
        : undefined;
      throw new BeaconError(
        typeof detail === "string" ? detail : `Beacon is unavailable (${response.status})`
      );
    }
    if (!isBeaconState(payload)) {
      throw new BeaconError("Beacon returned an invalid response");
    }
    return payload;
  }

  get(recipientId: string, signal?: AbortSignal): Promise<BeaconState> {
    return this.send(recipientId, "GET", signal);
  }

  request(recipientId: string, signal?: AbortSignal): Promise<BeaconState> {
    return this.send(recipientId, "POST", signal);
  }
}

/** Beacon is optional: without VITE_BEACON_API_URL, profiles show no AI card. */
export function createBeaconClient(): BeaconClient | null {
  const url = import.meta.env.VITE_BEACON_API_URL?.trim();
  return url ? new HttpBeaconClient(url) : null;
}
