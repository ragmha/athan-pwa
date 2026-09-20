import { beforeEach, describe, expect, it } from "vitest"
import {
  prayerDateKey,
  readCompletedPrayers,
  writeCompletedPrayers,
} from "@/lib/prayer-progress"

describe("prayer progress", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("uses the local calendar date as the progress key", () => {
    expect(prayerDateKey(new Date(2026, 8, 20, 23, 59))).toBe("2026-09-20")
  })

  it("round-trips completed prayers through validated storage", () => {
    const date = new Date(2026, 8, 20)
    writeCompletedPrayers(date, ["fajr", "isha", "isha"])

    expect([...readCompletedPrayers(date)]).toEqual(["fajr", "isha"])
  })

  it("keeps progress separate for different dates", () => {
    writeCompletedPrayers(new Date(2026, 8, 20), ["dhuhr"])
    writeCompletedPrayers(new Date(2026, 8, 21), ["asr"])

    expect([...readCompletedPrayers(new Date(2026, 8, 20))]).toEqual(["dhuhr"])
    expect([...readCompletedPrayers(new Date(2026, 8, 21))]).toEqual(["asr"])
  })

  it("falls back safely when stored progress is corrupt", () => {
    localStorage.setItem("athan.prayer-progress.2026-09-20", "{bad")

    expect(readCompletedPrayers(new Date(2026, 8, 20)).size).toBe(0)
  })
})
