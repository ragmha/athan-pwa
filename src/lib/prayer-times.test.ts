import { describe, expect, it } from "vitest"

import {
  getCurrentPrayer,
  getDayTimes,
  getNextPrayer,
  getQiblaBearing,
  getVisiblePrayerEntries,
  isValidDate,
  OBLIGATORY_PRAYERS,
  PRAYER_IDS,
  type PrayerId,
} from "@/lib/prayer-times"
import {
  DEFAULT_LOCATION,
  DEFAULT_SETTINGS,
  type AppLocation,
  type Settings,
} from "@/lib/schemas"

/**
 * The whole point of these tests is the high-latitude behaviour. Helsinki sits
 * at 60.17°N, where true Fajr and Isha do not occur for several weeks either
 * side of the summer solstice. See AGENTS.md §4.5 and §5.
 */

const HELSINKI: AppLocation = DEFAULT_LOCATION

const JEDDAH: AppLocation = {
  latitude: 21.4858,
  longitude: 39.1925,
  city: "Jeddah",
  countryCode: "SA",
  source: "manual",
}

const settings: Settings = DEFAULT_SETTINGS

function basisOf(day: ReturnType<typeof getDayTimes>, id: PrayerId) {
  return day.entries.find((entry) => entry.id === id)?.basis
}

function timeOf(day: ReturnType<typeof getDayTimes>, id: PrayerId): number {
  const entry = day.entries.find((item) => item.id === id)
  if (!entry) throw new Error(`missing prayer ${id}`)
  return entry.time.getTime()
}

const asrOf = (day: ReturnType<typeof getDayTimes>) => timeOf(day, "asr")
const ishaOf = (day: ReturnType<typeof getDayTimes>) => timeOf(day, "isha")

const SUMMER_SOLSTICE = new Date("2026-06-21T12:00:00Z")
const WINTER_SOLSTICE = new Date("2026-12-21T12:00:00Z")
const EQUINOX = new Date("2026-03-20T12:00:00Z")

describe("getDayTimes", () => {
  const cases = [
    ["Helsinki", HELSINKI, SUMMER_SOLSTICE],
    ["Helsinki", HELSINKI, WINTER_SOLSTICE],
    ["Helsinki", HELSINKI, EQUINOX],
    ["Jeddah", JEDDAH, SUMMER_SOLSTICE],
    ["Jeddah", JEDDAH, WINTER_SOLSTICE],
    ["Jeddah", JEDDAH, EQUINOX],
  ] as const

  it.each(cases)(
    "%s on %s produces seven valid, ordered times",
    (_city, location, date) => {
      const day = getDayTimes(location, settings, date)

      expect(day.entries).toHaveLength(PRAYER_IDS.length)

      for (const entry of day.entries) {
        expect(
          isValidDate(entry.time),
          `${entry.id} must be a valid date`
        ).toBe(true)
      }

      // Qiyam < Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha, always.
      const timestamps = day.entries.map((entry) => entry.time.getTime())
      const sorted = timestamps.toSorted((a, b) => a - b)
      expect(timestamps).toEqual(sorted)
    }
  )

  it("reports Helsinki's summer Fajr and Isha as astronomically undefined", () => {
    const day = getDayTimes(HELSINKI, settings, SUMMER_SOLSTICE)

    expect(day.hasApproximation).toBe(true)

    // At 60.17°N around midsummer the sun only reaches about 6° below the
    // horizon, so the 18° depression Fajr and Isha require never happens.
    // These times cannot be observed at all — they are wholly rule-derived.
    expect(basisOf(day, "fajr")).toBe("undefined")
    expect(basisOf(day, "isha")).toBe("undefined")
  })

  it("reports Helsinki's winter Fajr as observed with the middle-night rule", () => {
    // The API-compatible default uses the middle-of-the-night rule. In
    // December true twilight exists and this rule does not move Fajr, so it is
    // observed rather than marked as adjusted.
    const day = getDayTimes(HELSINKI, settings, WINTER_SOLSTICE)
    expect(basisOf(day, "fajr")).toBe("observed")
  })

  it("adds Qiyam at the start of the final third of the night", () => {
    const day = getDayTimes(
      HELSINKI,
      settings,
      new Date("2026-09-20T12:00:00Z")
    )
    const qiyam = day.entries.find((entry) => entry.id === "qiyam")
    const fajr = day.entries.find((entry) => entry.id === "fajr")
    const previous = getDayTimes(
      HELSINKI,
      settings,
      new Date("2026-09-19T12:00:00Z")
    )
    const maghrib = timeOf(previous, "maghrib")

    expect(qiyam?.basis).toBe("derived")
    expect(
      Math.abs(
        (qiyam?.time.getTime() ?? 0) -
          (maghrib + ((fajr?.time.getTime() ?? 0) - maghrib) * (2 / 3))
      )
    ).toBeLessThan(1_000)
    expect(qiyam?.time.getTime()).toBeLessThan(fajr?.time.getTime() ?? 0)
  })

  it("observes every prayer in Jeddah all year round", () => {
    for (const date of [SUMMER_SOLSTICE, WINTER_SOLSTICE, EQUINOX]) {
      const day = getDayTimes(JEDDAH, settings, date)
      expect(day.hasApproximation, `Jeddah on ${date.toISOString()}`).toBe(
        false
      )
    }
  })

  it("applies the Hanafi madhab to Asr", () => {
    const hanafi = getDayTimes(
      JEDDAH,
      { ...settings, madhab: "hanafi" },
      EQUINOX
    )
    const shafi = getDayTimes(JEDDAH, { ...settings, madhab: "shafi" }, EQUINOX)

    // Hanafi uses a 2× shadow length, so Asr is strictly later.
    expect(asrOf(hanafi)).toBeGreaterThan(asrOf(shafi))
  })

  it("uses Umm al-Qura for Saudi Arabia via country inference", () => {
    // calculationMethod is null by default, so the country drives it.
    const saudi = getDayTimes(JEDDAH, settings, EQUINOX)
    const forcedMwl = getDayTimes(
      JEDDAH,
      { ...settings, calculationMethod: "MuslimWorldLeague" },
      EQUINOX
    )

    // Umm al-Qura uses a 90-minute interval after Maghrib rather than an angle,
    // so it must differ from MWL.
    expect(ishaOf(saudi)).not.toBe(ishaOf(forcedMwl))
  })
})

describe("getNextPrayer", () => {
  it("returns a strictly future prayer", () => {
    const now = new Date("2026-03-20T10:00:00Z")
    const next = getNextPrayer(HELSINKI, settings, now)

    expect(next.time.getTime()).toBeGreaterThan(now.getTime())
    expect(next.msRemaining).toBeGreaterThan(0)
    expect(OBLIGATORY_PRAYERS).toContain(next.id)
  })

  it("never returns Sunrise, which is not prayed", () => {
    // Walk the whole day in 15-minute steps; Sunrise must never be "next".
    const start = new Date("2026-03-20T00:00:00Z")
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
      const now = new Date(start.getTime() + minutes * 60_000)
      const next = getNextPrayer(HELSINKI, settings, now)
      expect(next.id).not.toBe("sunrise")
    }
  })

  it("rolls over to tomorrow's Fajr after Isha", () => {
    const day = getDayTimes(HELSINKI, settings, EQUINOX)
    const afterIsha = new Date(ishaOf(day) + 60_000)
    const next = getNextPrayer(HELSINKI, settings, afterIsha)

    expect(next.id).toBe("fajr")
    expect(next.isTomorrow).toBe(true)
    expect(next.time.getTime()).toBeGreaterThan(afterIsha.getTime())
  })

  it("stays monotonic across the Helsinki DST transition", () => {
    // EET → EEST happens on the last Sunday of March at 03:00 local time.
    const beforeDst = new Date("2026-03-29T00:00:00Z")
    let previous = -Infinity

    for (let hours = 0; hours < 48; hours += 1) {
      const now = new Date(beforeDst.getTime() + hours * 3_600_000)
      const next = getNextPrayer(HELSINKI, settings, now)

      expect(isValidDate(next.time)).toBe(true)
      expect(next.msRemaining).toBeGreaterThanOrEqual(0)
      // The target only ever moves forward as time advances.
      expect(next.time.getTime()).toBeGreaterThanOrEqual(previous)
      previous = next.time.getTime()
    }
  })

  it("survives the polar summer without producing an invalid date", () => {
    // Tromsø is inside the Arctic Circle — the hardest case there is.
    const tromso: AppLocation = {
      latitude: 69.6492,
      longitude: 18.9553,
      city: "Tromsø",
      countryCode: "NO",
      source: "manual",
    }

    const next = getNextPrayer(tromso, settings, SUMMER_SOLSTICE)
    expect(isValidDate(next.time)).toBe(true)
    expect(next.msRemaining).toBeGreaterThanOrEqual(0)
  })
})

describe("getVisiblePrayerEntries", () => {
  it("keeps the calculated schedule intact when optional times are hidden", () => {
    const day = getDayTimes(HELSINKI, settings, EQUINOX)
    expect(
      getVisiblePrayerEntries(day, false).map((entry) => entry.id)
    ).toEqual(OBLIGATORY_PRAYERS)
    expect(day.entries.map((entry) => entry.id)).toEqual(PRAYER_IDS)
  })

  it("shows all seven times when the setting is enabled", () => {
    const day = getDayTimes(HELSINKI, settings, SUMMER_SOLSTICE)
    const entries = getVisiblePrayerEntries(day, true)
    expect(entries.map((entry) => entry.id)).toEqual(PRAYER_IDS)
    expect(entries.find((entry) => entry.id === "fajr")?.basis).toBe(
      "undefined"
    )
  })
})

describe("getCurrentPrayer", () => {
  it("reports no current prayer before Fajr", () => {
    const day = getDayTimes(JEDDAH, settings, EQUINOX)
    const beforeFajr = new Date(timeOf(day, "fajr") - 60_000)

    expect(getCurrentPrayer(JEDDAH, settings, beforeFajr)).toBeNull()
  })

  it("reports Fajr just after Fajr begins", () => {
    const day = getDayTimes(JEDDAH, settings, EQUINOX)
    const afterFajr = new Date(timeOf(day, "fajr") + 60_000)

    expect(getCurrentPrayer(JEDDAH, settings, afterFajr)).toBe("fajr")
  })

  it("only highlights Sunrise when the optional times are visible", () => {
    const day = getDayTimes(JEDDAH, settings, EQUINOX)
    const afterSunrise = new Date(timeOf(day, "sunrise") + 60_000)
    expect(getCurrentPrayer(JEDDAH, settings, afterSunrise)).toBeNull()
    expect(
      getCurrentPrayer(
        JEDDAH,
        { ...settings, showAdditionalTimes: true },
        afterSunrise
      )
    ).toBe("sunrise")
  })
})

describe("getQiblaBearing", () => {
  it("points roughly south-south-east from Helsinki", () => {
    // Makkah is far to the south and slightly east of Finland.
    // Verified by hand against the great-circle initial-bearing formula from
    // Helsinki (60.1699, 24.9384) to the Kaaba (21.4225, 39.8262).
    expect(getQiblaBearing(HELSINKI)).toBeCloseTo(158.22, 1)
  })

  it("returns a bearing within [0, 360)", () => {
    for (const location of [HELSINKI, JEDDAH]) {
      const bearing = getQiblaBearing(location)
      expect(bearing).toBeGreaterThanOrEqual(0)
      expect(bearing).toBeLessThan(360)
    }
  })
})
