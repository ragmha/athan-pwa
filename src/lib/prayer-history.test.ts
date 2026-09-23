import { openDB } from "idb"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readPrayerHistory, setPrayerCompleted } from "@/lib/prayer-history"
import { STORAGE_KEYS } from "@/lib/schemas"

async function putRawDay(value: unknown) {
  await readPrayerHistory()
  const database = await openDB<{ days: { key: string; value: unknown } }>(
    "athan-prayer-history",
    1
  )
  try {
    await database.put("days", value)
  } finally {
    database.close()
  }
}

describe("IndexedDB prayer history", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("round-trips completed prayers across separate database connections", async () => {
    await setPrayerCompleted("2026-09-20", "fajr", true)
    await setPrayerCompleted("2026-09-20", "isha", true)
    await setPrayerCompleted("2026-09-20", "isha", true)
    expect((await readPrayerHistory()).days).toEqual([
      { version: 1, dateKey: "2026-09-20", completed: ["fajr", "isha"] },
    ])
  })

  it("keeps dates separate and can remove a checkmark", async () => {
    await setPrayerCompleted("2026-09-20", "dhuhr", true)
    await setPrayerCompleted("2026-09-21", "asr", true)
    await setPrayerCompleted("2026-09-20", "dhuhr", false)
    expect((await readPrayerHistory()).days).toEqual([
      { version: 1, dateKey: "2026-09-20", completed: [] },
      { version: 1, dateKey: "2026-09-21", completed: ["asr"] },
    ])
  })

  it("merges simultaneous changes without losing a prayer", async () => {
    await Promise.all([
      setPrayerCompleted("2026-09-20", "fajr", true),
      setPrayerCompleted("2026-09-20", "dhuhr", true),
      setPrayerCompleted("2026-09-20", "asr", true),
    ])
    expect((await readPrayerHistory()).days[0]?.completed).toEqual([
      "fajr",
      "dhuhr",
      "asr",
    ])
  })

  it("migrates older dates but excludes Qiyam and Sunrise", async () => {
    const key = `${STORAGE_KEYS.prayerProgress}.2026-09-19`
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        completed: ["qiyam", "sunrise", "fajr", "fajr", "isha"],
      })
    )
    localStorage.setItem(
      `${STORAGE_KEYS.prayerProgress}.2026-09-20`,
      JSON.stringify({
        version: 1,
        completed: ["dhuhr"],
      })
    )

    const [first, second] = await Promise.all([
      readPrayerHistory(),
      readPrayerHistory(),
    ])
    expect(first.days).toEqual([
      { version: 1, dateKey: "2026-09-19", completed: ["fajr", "isha"] },
      { version: 1, dateKey: "2026-09-20", completed: ["dhuhr"] },
    ])
    expect(second.days).toEqual(first.days)
    expect(localStorage.getItem(key)).not.toBeNull()
  })

  it("never resurrects a removed checkmark from the legacy backup", async () => {
    localStorage.setItem(
      `${STORAGE_KEYS.prayerProgress}.2026-09-20`,
      JSON.stringify({
        version: 1,
        completed: ["fajr"],
      })
    )
    await readPrayerHistory()
    await setPrayerCompleted("2026-09-20", "fajr", false)
    expect((await readPrayerHistory()).days[0]?.completed).toEqual([])
  })

  it("reports corrupt legacy values, versions, and dates without discarding valid history", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    localStorage.setItem(`${STORAGE_KEYS.prayerProgress}.2026-09-18`, "{bad")
    localStorage.setItem(
      `${STORAGE_KEYS.prayerProgress}.2026-09-19`,
      JSON.stringify({
        version: 99,
        completed: ["fajr"],
      })
    )
    localStorage.setItem(
      `${STORAGE_KEYS.prayerProgress}.2026-02-31`,
      JSON.stringify({
        version: 1,
        completed: ["fajr"],
      })
    )
    await setPrayerCompleted("2026-09-20", "isha", true)

    const history = await readPrayerHistory()
    expect(history.warning).toMatch(/could not be imported/)
    expect(history.days).toEqual([
      { version: 1, dateKey: "2026-09-20", completed: ["isha"] },
    ])
  })

  it("reports corrupt IndexedDB records and refuses to overwrite them", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    await putRawDay({ version: 99, dateKey: "2026-09-20", completed: ["fajr"] })

    expect((await readPrayerHistory()).warning).toMatch(/could not be read/)
    await expect(
      setPrayerCompleted("2026-09-20", "isha", true)
    ).rejects.toThrow(/not changed/)
  })

  it("reports unavailable legacy storage while keeping IndexedDB usable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError")
    })
    await setPrayerCompleted("2026-09-20", "fajr", true)
    const history = await readPrayerHistory()
    expect(history.warning).toMatch(/not been imported/)
    expect(history.days[0]?.completed).toEqual(["fajr"])
  })

  it("rejects database failures instead of returning an empty successful history", async () => {
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError")
    })
    await expect(readPrayerHistory()).rejects.toThrow("Storage denied")
  })

  it("keeps saved progress unchanged when a write fails", async () => {
    await setPrayerCompleted("2026-09-20", "fajr", true)
    const put = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(() => {
        throw new DOMException("Storage full", "QuotaExceededError")
      })
    await expect(
      setPrayerCompleted("2026-09-20", "isha", true)
    ).rejects.toThrow("Storage full")
    put.mockRestore()
    expect((await readPrayerHistory()).days[0]?.completed).toEqual(["fajr"])
  })

  it("rejects invalid calendar dates before writing", async () => {
    await expect(
      setPrayerCompleted("2026-02-31", "fajr", true)
    ).rejects.toThrow(/invalid/)
    expect((await readPrayerHistory()).days).toEqual([])
  })
})
