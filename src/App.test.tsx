import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/App"
import { AppStateProvider } from "@/components/app-state-provider"
import { ThemeProvider } from "@/components/theme-provider"
import {
  DEFAULT_LOCATION,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  TRACKED_PRAYER_IDS,
} from "@/lib/schemas"
import { formatGregorian } from "@/lib/format"
import { formatHijri } from "@/lib/hijri"
import { prayerDateKey } from "@/lib/prayer-progress"
import { readPrayerHistory, setPrayerCompleted } from "@/lib/prayer-history"

/**
 * A mounting smoke test. It is deliberately shallow on assertions and broad on
 * coverage: its job is to catch the wiring failures — a missing provider, a bad
 * import, a hook called outside its context — that typechecking cannot see and
 * that would otherwise only surface as a blank screen on a phone.
 */
function renderApp(route = "/") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-09-20T23:11:00"))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("renders the prayer list with the default location", async () => {
    renderApp()

    expect(
      await screen.findByRole("button", { name: /Helsinki/ })
    ).toBeInTheDocument()

    const list = screen.getByRole("list", { name: "Prayer times" })
    for (const name of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
      expect(within(list).getByText(name)).toBeInTheDocument()
    }
    expect(within(list).queryByText("Qiyam")).not.toBeInTheDocument()
    expect(within(list).queryByText("Sunrise")).not.toBeInTheDocument()
  })

  it("shows a real time rather than a placeholder for Dhuhr", async () => {
    renderApp()
    await screen.findByRole("button", { name: /Helsinki/ })

    // Dhuhr is solar noon: it is defined at every latitude on every day, so a
    // placeholder here means the calculation never ran.
    const times = screen.getAllByText(/^\d{2}:\d{2}$/)
    expect(times.length).toBeGreaterThanOrEqual(5)
  })

  it("only tracks the five daily prayers", async () => {
    renderApp()
    await screen.findByRole("button", { name: /Helsinki/ })

    expect(screen.getAllByRole("checkbox")).toHaveLength(5)
    expect(
      screen.queryByRole("checkbox", { name: /Qiyam|Sunrise/ })
    ).not.toBeInTheDocument()
  })

  it("shows both calendars together above the prayer overview", async () => {
    renderApp()
    const date = await screen.findByRole("region", { name: "Today's date" })

    expect(date).toHaveTextContent(formatGregorian(new Date()))
    expect(date).toHaveTextContent(formatHijri(new Date()))
  })

  it("shows the next prayer in English and Arabic with a countdown", async () => {
    vi.setSystemTime(new Date("2026-09-20T11:30:00Z"))
    renderApp()
    const overview = await screen.findByRole("region", {
      name: "Prayer overview",
    })

    expect(
      within(overview).getByRole("heading", { level: 1 })
    ).toHaveTextContent("Next: Asr")
    expect(within(overview).getByText("العصر")).toHaveAttribute("lang", "ar")
    expect(within(overview).getByText(/^In /)).toBeInTheDocument()
    expect(
      overview.querySelector('[data-slot="next-prayer-time"]')
    ).toHaveTextContent(/^\d{2}:\d{2}$/)
    expect(
      [...overview.querySelectorAll("[data-prayer-id]")].map((marker) =>
        marker.getAttribute("data-prayer-id")
      )
    ).toEqual(TRACKED_PRAYER_IDS)
  })

  it.each(["12h", "24h"] as const)(
    "keeps high-latitude markers on their prayer rows in %s format",
    async (clockFormat) => {
      vi.setSystemTime(new Date("2026-06-21T12:00:00"))
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify({ ...DEFAULT_SETTINGS, clockFormat })
      )

      renderApp()
      await screen.findByRole("button", { name: /Helsinki/ })
      const list = screen.getByRole("list", { name: "Prayer times" })

      for (const prayer of ["Fajr", "Isha"]) {
        const row = within(list).getByText(prayer).closest("li")
        expect(row).toHaveTextContent("No true twilight — estimated")
        expect(
          document.querySelector(`[data-prayer-id="${prayer.toLowerCase()}"]`)
        ).toHaveAttribute("stroke-dasharray", "2 2")
      }
      expect(screen.getByText(/At this latitude/)).toHaveTextContent(/Method:/)
    }
  )

  it("lets the larger checkbox label toggle a prayer", async () => {
    renderApp()
    await screen.findByText("0 of 5 prayers completed")
    const fajr = screen.getByRole("checkbox", {
      name: "Mark Fajr as completed",
    })
    const label = fajr.closest("label")
    expect(label).not.toBeNull()
    if (!label) throw new Error("Prayer completion needs a clickable label")

    fireEvent.click(label)

    await screen.findByText("1 of 5 prayers completed")
    expect(fajr).toBeChecked()
  })

  it("restores checkmarks from IndexedDB after remounting", async () => {
    const view = renderApp()
    await screen.findByText("0 of 5 prayers completed")

    const fajr = screen.getByRole("checkbox", {
      name: "Mark Fajr as completed",
    })
    expect(fajr).not.toBeChecked()

    fireEvent.click(fajr)

    await screen.findByText("1 of 5 prayers completed")
    expect(fajr).toBeChecked()
    expect((await readPrayerHistory()).days).toEqual([
      { version: 1, dateKey: prayerDateKey(new Date()), completed: ["fajr"] },
    ])
    expect(
      localStorage.getItem(
        `${STORAGE_KEYS.prayerProgress}.${prayerDateKey(new Date())}`
      )
    ).toBeNull()

    view.unmount()
    renderApp()
    await screen.findByText("1 of 5 prayers completed")
    expect(
      screen.getByRole("checkbox", { name: "Mark Fajr as not completed" })
    ).toBeChecked()
  })

  it("extends the streak only after all five prayers are saved", async () => {
    await Promise.all(
      ["2026-09-18", "2026-09-19"].flatMap((dateKey) =>
        TRACKED_PRAYER_IDS.map((prayer) =>
          setPrayerCompleted(dateKey, prayer, true)
        )
      )
    )
    renderApp()
    await screen.findByText("0 of 5 prayers completed")
    expect(screen.getByText("2-day streak")).toBeInTheDocument()

    for (const name of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
      fireEvent.click(
        screen.getByRole("checkbox", { name: `Mark ${name} as completed` })
      )
      // oxlint-disable-next-line no-await-in-loop -- Each tap waits for the previous save.
      await screen.findByRole("checkbox", {
        name: `Mark ${name} as not completed`,
      })
    }
    expect(screen.getByText("5 of 5 prayers completed")).toBeInTheDocument()
    expect(screen.getByText("3-day streak")).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Mark Isha as not completed" })
    )
    await screen.findByText("4 of 5 prayers completed")
    expect(screen.getByText("2-day streak")).toBeInTheDocument()
  })

  it("can opt into optional times without tracking them, and remembers the setting", async () => {
    const view = renderApp("/settings")
    const checkbox = await screen.findByRole("checkbox", {
      name: "Show Qiyam and Sunrise",
    })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(localStorage.getItem(STORAGE_KEYS.settings)).toContain(
      '"showAdditionalTimes":true'
    )

    fireEvent.click(screen.getByRole("link", { name: "Prayers" }))
    await screen.findByText("0 of 5 prayers completed")
    const list = screen.getByRole("list", { name: "Prayer times" })
    expect(within(list).getByText("Qiyam")).toBeInTheDocument()
    expect(within(list).getByText("Sunrise")).toBeInTheDocument()
    expect(within(list).getAllByRole("checkbox")).toHaveLength(5)
    expect(document.querySelectorAll("[data-prayer-id]")).toHaveLength(7)

    view.unmount()
    renderApp("/settings")
    const restored = await screen.findByRole("checkbox", {
      name: "Show Qiyam and Sunrise",
    })
    expect(restored).toBeChecked()
    fireEvent.click(restored)
    fireEvent.click(screen.getByRole("link", { name: "Prayers" }))
    await screen.findByText("0 of 5 prayers completed")
    expect(screen.queryByText("Qiyam")).not.toBeInTheDocument()
    expect(screen.queryByText("Sunrise")).not.toBeInTheDocument()
    expect(document.querySelectorAll("[data-prayer-id]")).toHaveLength(5)
  })

  it("reports unavailable history and lets the user retry", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const open = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError")
    })
    renderApp()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load prayer history"
    )
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toHaveAttribute("aria-disabled", "true")
    }
    expect(screen.queryByText("0-day streak")).not.toBeInTheDocument()

    open.mockRestore()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    await screen.findByText("0 of 5 prayers completed")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("does not claim a prayer was saved when IndexedDB rejects the write", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    renderApp()
    await screen.findByText("0 of 5 prayers completed")
    const put = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(() => {
        throw new DOMException("Storage full", "QuotaExceededError")
      })
    const fajr = screen.getByRole("checkbox", {
      name: "Mark Fajr as completed",
    })
    fireEvent.click(fajr)
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save this change"
    )
    expect(fajr).not.toBeChecked()
    expect(screen.getByText("0 of 5 prayers completed")).toBeInTheDocument()

    put.mockRestore()
    await waitFor(() =>
      expect(fajr).not.toHaveAttribute("aria-disabled", "true")
    )
    fireEvent.click(fajr)
    await screen.findByText("1 of 5 prayers completed")
    expect(fajr).toBeChecked()
  })

  it("exposes the three main tabs", async () => {
    renderApp()
    const nav = await screen.findByRole("navigation", { name: "Main" })

    for (const label of ["Prayers", "Qibla", "Settings"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument()
    }
  })

  it("renders the Qibla bearing as text, without a compass", async () => {
    renderApp("/qibla")

    // jsdom has no magnetometer, which is the same situation as a desktop
    // browser: the bearing must still be readable.
    expect(await screen.findByText(/158\.2°/)).toBeInTheDocument()
  })

  it("restores a persisted location", async () => {
    localStorage.setItem(
      STORAGE_KEYS.location,
      JSON.stringify({
        ...DEFAULT_LOCATION,
        city: "Istanbul",
        latitude: 41.0082,
        longitude: 28.9784,
        countryCode: "TR",
        source: "manual",
      })
    )

    renderApp()
    expect(
      await screen.findByRole("button", { name: /Istanbul/ })
    ).toBeInTheDocument()
  })

  it("falls back to defaults when persisted state is corrupt", async () => {
    localStorage.setItem(STORAGE_KEYS.location, "{ not json")
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ nope: true }))

    renderApp()
    expect(
      await screen.findByRole("button", { name: /Helsinki/ })
    ).toBeInTheDocument()
  })
})
