import { useSyncExternalStore } from "react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

/**
 * A minimal history-based router: no dependency, real URLs (/about,
 * /recipients/abc), and Nginx's `try_files ... /index.html` serves deep links.
 */
const NAVIGATE_EVENT = "atlas:navigate";

export interface AppLocation {
  pathname: string;
  search: string;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

let cached: AppLocation = { pathname: "/", search: "" };

function snapshot(): AppLocation {
  const { pathname, search } = window.location;
  if (cached.pathname !== pathname || cached.search !== search) {
    cached = { pathname, search };
  }
  return cached;
}

export function useLocation(): AppLocation {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

// How many in-app pages are behind the current one, so "Back" can return to
// the visitor's earlier search instead of leaving the site.
let inAppDepth = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    inAppDepth = Math.max(0, inAppDepth - 1);
  });
}

export function canGoBack(): boolean {
  return inAppDepth > 0;
}

export function navigate(to: string, { replace = false } = {}): void {
  const current = window.location.pathname + window.location.search;
  if (to === current) return;
  if (replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
    inAppDepth += 1;
    window.scrollTo?.({ top: 0 });
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  children: ReactNode;
}

/** An anchor that navigates in place, while modified clicks open new tabs. */
export function Link({ to, children, onClick, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }
  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
