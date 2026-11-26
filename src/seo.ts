/** The one official address of each page, for search engines. */
export const SITE_URL = "https://atlas.zionkoudijs.com";

function headTag<T extends HTMLElement>(selector: string, create: () => T): T {
  const existing = document.head.querySelector<T>(selector);
  if (existing) return existing;
  const element = create();
  document.head.append(element);
  return element;
}

/**
 * Point search engines at the page's address without search filters, so
 * "/?q=…" variations are not indexed as separate pages.
 */
export function setCanonical(pathname: string): void {
  const link = headTag<HTMLLinkElement>('link[rel="canonical"]', () => {
    const element = document.createElement("link");
    element.rel = "canonical";
    return element;
  });
  link.href = `${SITE_URL}${pathname}`;
}

/**
 * Ask search engines not to index this page. Used for individuals' profiles,
 * so private people's names are not pushed into search results.
 */
export function setNoIndex(noIndex: boolean): void {
  const existing = document.head.querySelector('meta[name="robots"]');
  if (!noIndex) {
    existing?.remove();
    return;
  }
  const meta = headTag<HTMLMetaElement>('meta[name="robots"]', () => {
    const element = document.createElement("meta");
    element.name = "robots";
    return element;
  });
  meta.content = "noindex";
}
