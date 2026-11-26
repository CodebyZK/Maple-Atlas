import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrolling; the app calls these when changing pages.
window.scrollTo = () => undefined;
Element.prototype.scrollIntoView = () => undefined;
