import "@testing-library/jest-dom/vitest"

// jsdom implements neither of these, and both are used on first paint: the
// theme provider probes the colour scheme, and the SVG dial is measured by
// Base UI's popovers. Stubbing them here keeps every test file from repeating it.
// The types claim both exist in a DOM lib environment, so these are assigned
// unconditionally rather than guarded — jsdom simply does not provide them.
window.matchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
