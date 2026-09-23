import "@testing-library/jest-dom/vitest"
import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { beforeEach } from "vitest"

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

// jsdom implements neither of these, and both are used on first paint: the
// theme provider probes the colour scheme, and Base UI's popovers measure their
// anchors. Stubbing them here keeps every test file from repeating it.
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
