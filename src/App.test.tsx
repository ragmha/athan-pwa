import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"
import App from "@/App"
import { AppStateProvider } from "@/components/app-state-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DEFAULT_LOCATION, STORAGE_KEYS } from "@/lib/schemas"
import { prayerDateKey } from "@/lib/prayer-progress"

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
  })

  it("renders the prayer list with the default location", async () => {
    renderApp()

    expect(
      await screen.findByRole("button", { name: /Helsinki/ })
    ).toBeInTheDocument()

    const list = screen.getByRole("list", { name: "Prayer times" })
    for (const name of ["Fajr", "Shuruq", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
      expect(within(list).getByText(name)).toBeInTheDocument()
    }
  })

  it("shows a real time rather than a placeholder for Dhuhr", async () => {
    renderApp()
    await screen.findByRole("button", { name: /Helsinki/ })

    // Dhuhr is solar noon: it is defined at every latitude on every day, so a
    // placeholder here means the calculation never ran.
    const times = screen.getAllByText(/^\d{2}:\d{2}$/)
    expect(times.length).toBeGreaterThanOrEqual(5)
  })

  it("tracks completed prayers for the current day", async () => {
    renderApp()
    await screen.findByRole("button", { name: /Helsinki/ })

    const fajr = screen.getByRole("checkbox", { name: "Mark Fajr as completed" })
    expect(fajr).not.toBeChecked()

    fireEvent.click(fajr)

    expect(fajr).toBeChecked()
    expect(screen.getByText("1 of 5 prayers completed")).toBeInTheDocument()
    expect(
      localStorage.getItem(
        `${STORAGE_KEYS.prayerProgress}.${prayerDateKey(new Date())}`
      )
    ).toContain('"fajr"')
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
