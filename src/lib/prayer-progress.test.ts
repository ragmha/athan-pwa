import { describe, expect, it } from "vitest"
import { getPrayerStreak, prayerDateKey } from "@/lib/prayer-progress"
import {
  isTrackedPrayer,
  PRAYER_IDS,
  STORAGE_VERSION,
  TRACKED_PRAYER_IDS,
  type PrayerDayProgress,
} from "@/lib/schemas"

function day(
  dateKey: string,
  completed: PrayerDayProgress["completed"] = [...TRACKED_PRAYER_IDS]
): PrayerDayProgress {
  return { version: STORAGE_VERSION, dateKey, completed }
}

describe("prayer progress", () => {
  const today = new Date(2026, 8, 20, 23, 59)

  it("uses the local calendar date", () => {
    expect(prayerDateKey(today)).toBe("2026-09-20")
  })

  it("rejects invalid dates", () => {
    expect(() => prayerDateKey(new Date(Number.NaN))).toThrow(RangeError)
  })

  it("only tracks the five daily prayers", () => {
    expect(PRAYER_IDS.filter(isTrackedPrayer)).toEqual([
      "fajr",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ])
  })

  it("starts at zero without history", () => {
    expect(getPrayerStreak([], today)).toBe(0)
  })

  it("counts consecutive days when all five prayers are complete", () => {
    expect(
      getPrayerStreak(
        [day("2026-09-18"), day("2026-09-19"), day("2026-09-20")],
        today
      )
    ).toBe(3)
  })

  it("preserves yesterday's streak while today is still in progress", () => {
    expect(
      getPrayerStreak(
        [day("2026-09-18"), day("2026-09-19"), day("2026-09-20", ["fajr"])],
        today
      )
    ).toBe(2)
  })

  it("breaks at an incomplete or missing day", () => {
    expect(
      getPrayerStreak(
        [day("2026-09-18"), day("2026-09-19", ["fajr"]), day("2026-09-20")],
        today
      )
    ).toBe(1)
    expect(getPrayerStreak([day("2026-09-18")], today)).toBe(0)
  })

  it("does not count five copies of the same prayer as a completed day", () => {
    expect(
      getPrayerStreak(
        [day("2026-09-20", ["fajr", "fajr", "fajr", "fajr", "fajr"])],
        today
      )
    ).toBe(0)
  })

  it("ignores future days and duplicate history records", () => {
    expect(
      getPrayerStreak(
        [day("2026-09-20"), day("2026-09-20"), day("2026-09-21")],
        today
      )
    ).toBe(1)
  })

  it.each([
    ["2025-12-31", "2026-01-01", "2026-01-02"],
    ["2024-02-28", "2024-02-29", "2024-03-01"],
    ["2026-03-28", "2026-03-29", "2026-03-30"],
    ["2026-10-24", "2026-10-25", "2026-10-26"],
  ])(
    "counts local days across calendar boundaries ending on %s",
    (first, second, last) => {
      expect(
        getPrayerStreak(
          [day(first), day(second), day(last)],
          new Date(`${last}T23:30:00`)
        )
      ).toBe(3)
    }
  )
})
