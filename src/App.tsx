import { useEffect, useMemo } from "react";
import { createBeaconClient } from "./beaconClient";
import { createDataClient } from "./dataClient";
import { SiteFooter, SiteHeader } from "./Layout";
import { AboutPage, HowItWorksPage, MethodsPage, NotFoundPage } from "./pages/ContentPages";
import RecipientPage from "./pages/RecipientPage";
import SearchPage from "./pages/SearchPage";
import { useLocation } from "./router";

const TITLES: Record<string, string> = {
  "/": "Search Canadian federal grants",
  "/how-it-works": "How it works",
  "/methods": "Data & methods",
  "/about": "About"
};

export default function App() {
  const dataClient = useMemo(() => createDataClient(), []);
  const beaconClient = useMemo(() => createBeaconClient(), []);
  const { pathname } = useLocation();
  const recipientMatch = pathname.match(/^\/recipients\/([^/]+)\/?$/);

  useEffect(() => {
    const title = recipientMatch ? "Recipient profile" : TITLES[pathname] ?? "Page not found";
    document.title = `${title} · Maple Atlas`;
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  let page;
  if (pathname === "/") {
    page = <SearchPage dataClient={dataClient} />;
  } else if (recipientMatch) {
    page = (
      <RecipientPage
        recipientId={decodeURIComponent(recipientMatch[1])}
        dataClient={dataClient}
        beaconClient={beaconClient}
      />
    );
  } else if (pathname === "/how-it-works") {
    page = <HowItWorksPage />;
  } else if (pathname === "/methods") {
    page = <MethodsPage />;
  } else if (pathname === "/about") {
    page = <AboutPage />;
  } else {
    page = <NotFoundPage />;
  }

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>{page}</main>
      <SiteFooter />
    </>
  );
}
