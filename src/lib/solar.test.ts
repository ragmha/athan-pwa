import { describe, expect, it } from "vitest"
import {
  minimumSolarAltitude,
  solarDeclination,
  twilightOccurs,
} from "@/lib/solar"

/**
 * These tests exist because `adhan` cannot answer the question this module
 * answers. Adhan will always hand back *a* time for Fajr, falling back to a
 * night-portion rule when no true twilight exists — so without an independent
 * check of the solar geometry the app has no way to know whether a time was
 * observed or invented, and AGENTS.md §4.5 could not be honoured.
 */

const HELSINKI = 60.1699
const JEDDAH = 21.4225
const TROMSO = 69.6492

const SUMMER_SOLSTICE = new Date(2026, 5, 21)
const WINTER_SOLSTICE = new Date(2026, 11, 21)
const EQUINOX = new Date(2026, 2, 20)

describe("solarDeclination", () => {
  it("peaks near +23.44° at the June solstice", () => {
    expect(solarDeclination(SUMMER_SOLSTICE)).toBeCloseTo(23.44, 0)
  })

  it("bottoms out near -23.44° at the December solstice", () => {
    expect(solarDeclination(WINTER_SOLSTICE)).toBeCloseTo(-23.44, 0)
  })

  it("crosses zero at the equinox", () => {
    expect(Math.abs(solarDeclination(EQUINOX))).toBeLessThan(1)
  })
})

describe("minimumSolarAltitude", () => {
  // Altitude at lower culmination is |latitude + declination| - 90, which is
  // small enough to verify by hand — and these were.
  it("reaches only about -6.4° at Helsinki in midsummer", () => {
    expect(minimumSolarAltitude(HELSINKI, SUMMER_SOLSTICE)).toBeCloseTo(-6.4, 0)
  })

  it("falls far below the horizon at Helsinki in midwinter", () => {
    expect(minimumSolarAltitude(HELSINKI, WINTER_SOLSTICE)).toBeCloseTo(
      -53.3,
      0
    )
  })

  it("stays deep below the horizon at Jeddah year round", () => {
    for (const date of [SUMMER_SOLSTICE, WINTER_SOLSTICE, EQUINOX]) {
      expect(minimumSolarAltitude(JEDDAH, date)).toBeLessThan(-40)
    }
  })

  it("does not set at all at Tromsø in midsummer", () => {
    // Inside the Arctic Circle the sun stays above the horizon entirely.
    expect(minimumSolarAltitude(TROMSO, SUMMER_SOLSTICE)).toBeGreaterThan(0)
  })
})

describe("twilightOccurs", () => {
  it("rejects 18° twilight at Helsinki in midsummer", () => {
    expect(twilightOccurs(HELSINKI, SUMMER_SOLSTICE, 18)).toBe(false)
  })

  it("accepts 18° twilight at Helsinki in midwinter", () => {
    expect(twilightOccurs(HELSINKI, WINTER_SOLSTICE, 18)).toBe(true)
  })

  it("accepts 18° twilight at Jeddah all year", () => {
    for (const date of [SUMMER_SOLSTICE, WINTER_SOLSTICE, EQUINOX]) {
      expect(twilightOccurs(JEDDAH, date, 18)).toBe(true)
    }
  })

  it("treats a zero angle as always satisfied", () => {
    // Umm al-Qura and Qatar define Isha as a fixed interval after Maghrib and
    // set the angle to 0. Such a time is always defined, so the geometry check
    // must not veto it.
    expect(twilightOccurs(HELSINKI, SUMMER_SOLSTICE, 0)).toBe(true)
  })

  it("is monotonic in the angle", () => {
    // A shallower depression can never be harder to reach than a deeper one.
    const date = new Date(2026, 4, 15)
    let previous = true

    for (const angle of [6, 12, 15, 18]) {
      const occurs = twilightOccurs(HELSINKI, date, angle)
      if (!previous) expect(occurs).toBe(false)
      previous = occurs
    }
  })
})
