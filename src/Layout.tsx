import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "./router";

export const SOURCE_URL =
  "https://open.canada.ca/data/en/dataset/432527ab-7aac-45b5-81d6-7597107a7013";

const NAV = [
  { to: "/", label: "Search" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/methods", label: "Data & methods" },
  { to: "/about", label: "About" }
];

function isCurrent(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/" || pathname.startsWith("/recipients/");
  return pathname === to;
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">Skip to content</a>
      <Link className="brand" to="/" aria-label="Maple Atlas home">
        <span className="brand-mark" aria-hidden="true">M</span>
        <span>Maple <strong>Atlas</strong></span>
      </Link>
      <button
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>
      <nav id="site-nav" className={open ? "site-nav open" : "site-nav"} aria-label="Main">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={isCurrent(pathname, item.to) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <strong>Maple Atlas</strong>
        <p>
          A free, independent search tool for Canadian federal grants and
          contributions. Not affiliated with the Government of Canada.
        </p>
      </div>
      <nav aria-label="Footer">
        <Link to="/how-it-works">How it works</Link>
        <Link to="/methods">Data &amp; methods</Link>
        <Link to="/about">About</Link>
        <a href={SOURCE_URL}>Government source data ↗</a>
      </nav>
      <p className="footer-licence">
        Contains information licensed under the{" "}
        <a href="https://open.canada.ca/en/open-government-licence-canada">
          Open Government Licence – Canada
        </a>
        . Map shapes from Natural Earth.
      </p>
    </footer>
  );
}

/** A readable content page: title, lead paragraph, then sections. */
export function ContentPage({
  eyebrow,
  title,
  lead,
  children
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="content-page">
      <header className="content-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="content-lead">{lead}</p>
      </header>
      <div className="content-body">{children}</div>
    </article>
  );
}
