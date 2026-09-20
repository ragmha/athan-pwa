import {
  CalculationMethod,
  type CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
  Qibla,
} from "adhan"

import { resolveCalculationMethod } from "@/lib/method-map"
import { twilightOccurs } from "@/lib/solar"
import type {
  AppLocation,
  HighLatitudeRuleKey,
  PrayerId,
  Settings,
} from "@/lib/schemas"
import { PRAYER_IDS } from "@/lib/schemas"

export type { PrayerId } from "@/lib/schemas"
export { PRAYER_IDS } from "@/lib/schemas"

/**
 * Pure prayer-time layer. Everything here is a function of
 * (coordinates, date, settings) — no I/O, no `Date.now()` — so it is fully
 * unit-testable. See AGENTS.md §5.
 */

/** Tracked prayers; Sunrise is displayed but never "next". */
export const OBLIGATORY_PRAYERS: readonly PrayerId[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
]

export const PRAYER_LABELS: Record<PrayerId, { en: string; ar: string }> = {
  qiyam: { en: "Qiyam", ar: "قيام الليل" },
  fajr: { en: "Fajr", ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  dhuhr: { en: "Dhuhr", ar: "الظهر" },
  asr: { en: "Asr", ar: "العصر" },
  maghrib: { en: "Maghrib", ar: "المغرب" },
  isha: { en: "Isha", ar: "العشاء" },
}

export interface PrayerEntry {
  id: PrayerId
  time: Date
  /**
   * How this time was arrived at. Anything other than `observed` must be
   * disclosed in the UI — see AGENTS.md §4.5.
   *
   * - `observed`     — derived directly from the sun's position.
   * - `ruleAdjusted` — twilight does occur, but the selected high-latitude rule
   *                    moved the time (e.g. clamping Fajr to a night portion).
   * - `undefined`    — twilight never occurs on this date at this latitude, so
   *                    the time is entirely a construct of the rule.
   */
  basis: PrayerBasis
}

export type PrayerBasis =
  | "observed"
  | "ruleAdjusted"
  | "undefined"
  | "derived"

export interface DayTimes {
  date: Date
  entries: PrayerEntry[]
  /** Which high-latitude rule `adhan` was actually given. */
  highLatitudeRule: string
  /** True when any entry was not directly observed. */
  hasApproximation: boolean
}

function toCoordinates(location: AppLocation): Coordinates {
  return new Coordinates(location.latitude, location.longitude)
}

function resolveHighLatitudeRule(
  key: HighLatitudeRuleKey,
  coordinates: Coordinates
): string {
  switch (key) {
    case "auto":
      return HighLatitudeRule.recommended(coordinates)
    case "middleofthenight":
      return HighLatitudeRule.MiddleOfTheNight
    case "seventhofthenight":
      return HighLatitudeRule.SeventhOfTheNight
    case "twilightangle":
      return HighLatitudeRule.TwilightAngle
    default:
      return HighLatitudeRule.recommended(coordinates)
  }
}

function buildParameters(location: AppLocation, settings: Settings) {
  const coordinates = toCoordinates(location)
  const methodKey = resolveCalculationMethod(settings, location)
  const parameters = CalculationMethod[methodKey]()

  parameters.madhab =
    settings.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi
  parameters.highLatitudeRule = resolveHighLatitudeRule(
    settings.highLatitudeRule,
    coordinates
  )
  // Without this, locations inside the polar circle can yield invalid dates
  // rather than a usable time. AqrabYaum substitutes the nearest day on which
  // the times are computable.
  parameters.polarCircleResolution = PolarCircleResolution.AqrabYaum

  return { coordinates, parameters }
}

/**
 * True when `time` is not a real date. `adhan` returns Invalid Date rather than
 * throwing when a prayer cannot be computed, and an Invalid Date silently
 * poisons every downstream comparison, so it is checked explicitly.
 */
function isValidDate(time: Date): boolean {
  return !Number.isNaN(time.getTime())
}

function getQiyamTime(
  coordinates: Coordinates,
  date: Date,
  parameters: CalculationParameters
): Date {
  const today = new PrayerTimes(coordinates, date, parameters)
  const previous = new PrayerTimes(coordinates, addDays(date, -1), parameters)

  if (!isValidDate(today.fajr) || !isValidDate(previous.maghrib)) {
    return new Date(Number.NaN)
  }

  // Qiyam begins at the final third of the night: two thirds of the interval
  // from the previous sunset to today's Fajr. This is the 01:30-style value
  // used by the reference schedule for Helsinki on 20 September 2026.
  const nightStart = previous.maghrib.getTime()
  const dawn = today.fajr.getTime()
  return new Date(nightStart + (dawn - nightStart) * (2 / 3))
}

/**
 * Classifies how Fajr and Isha were arrived at.
 *
 * Two independent questions are asked, because they mean different things:
 *
 * 1. *Does the required twilight occur at all?* Determined from solar geometry
 *    (`src/lib/solar.ts`), independently of `adhan`. If the sun never reaches
 *    the required depression, the time cannot be observed and is `undefined`.
 * 2. *Did the chosen rule move the time?* Compared against the pure
 *    twilight-angle calculation. A shift of more than a minute is
 *    `ruleAdjusted`.
 *
 * This distinction matters at Helsinki's latitude, where the recommended
 * seventh-of-the-night rule clamps Fajr on *most* nights of the year, but only
 * around midsummer is the prayer genuinely unobservable.
 */
function classifyBases(
  coordinates: Coordinates,
  date: Date,
  settings: Settings,
  location: AppLocation,
  actual: Record<PrayerId, Date>,
  parameters: CalculationParameters
): Map<PrayerId, PrayerBasis> {
  const bases = new Map<PrayerId, PrayerBasis>()

  const methodKey = resolveCalculationMethod(settings, location)
  const unadjusted = CalculationMethod[methodKey]()
  unadjusted.madhab =
    settings.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi
  unadjusted.highLatitudeRule = HighLatitudeRule.TwilightAngle
  const reference = new PrayerTimes(coordinates, date, unadjusted)

  // Isha is defined by a fixed interval after Maghrib under some methods
  // (Umm al-Qura, Qatar), in which case no twilight angle is involved at all.
  const ishaUsesInterval = parameters.ishaInterval > 0

  const checks = [
    { id: "fajr" as const, angle: parameters.fajrAngle, angular: true },
    {
      id: "isha" as const,
      angle: parameters.ishaAngle,
      angular: !ishaUsesInterval,
    },
  ]

  for (const { id, angle, angular } of checks) {
    const time = actual[id]

    if (!isValidDate(time)) {
      bases.set(id, "undefined")
      continue
    }

    if (angular && !twilightOccurs(location.latitude, date, angle)) {
      bases.set(id, "undefined")
      continue
    }

    const referenceTime = reference[id]
    const shifted =
      !isValidDate(referenceTime) ||
      Math.abs(referenceTime.getTime() - time.getTime()) > 60_000

    bases.set(id, shifted ? "ruleAdjusted" : "observed")
  }

  return bases
}

/** All six times for the calendar day containing `date`. */
export function getDayTimes(
  location: AppLocation,
  settings: Settings,
  date: Date
): DayTimes {
  const { coordinates, parameters } = buildParameters(location, settings)
  const times = new PrayerTimes(coordinates, date, parameters)

  const actual: Record<PrayerId, Date> = {
    qiyam: getQiyamTime(coordinates, date, parameters),
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  }

  const bases = classifyBases(
    coordinates,
    date,
    settings,
    location,
    actual,
    parameters
  )

  const entries: PrayerEntry[] = PRAYER_IDS.map((id) => ({
    id,
    time: actual[id],
    basis: id === "qiyam" ? "derived" : (bases.get(id) ?? "observed"),
  }))

  return {
    date,
    entries,
    highLatitudeRule: parameters.highLatitudeRule,
    hasApproximation: entries.some(
      (entry) =>
        (entry.id === "fajr" || entry.id === "isha") &&
        entry.basis !== "observed"
    ),
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export interface NextPrayer {
  id: PrayerId
  time: Date
  basis: PrayerBasis
  /** True when the next prayer falls on the following calendar day. */
  isTomorrow: boolean
  /** Milliseconds from `now` until `time`; never negative. */
  msRemaining: number
}

/**
 * The next obligatory prayer after `now`.
 *
 * Crossing midnight is the interesting case: after Isha the next prayer is
 * tomorrow's Fajr, which lives in a different `PrayerTimes` instance. Because
 * this works on absolute `Date` values it also stays correct across a DST
 * transition, which Helsinki observes.
 */
export function getNextPrayer(
  location: AppLocation,
  settings: Settings,
  now: Date
): NextPrayer {
  const today = getDayTimes(location, settings, now)

  const upcoming = today.entries
    .filter((entry) => OBLIGATORY_PRAYERS.includes(entry.id))
    .filter((entry) => isValidDate(entry.time) && entry.time.getTime() > now.getTime())
    .toSorted((a, b) => a.time.getTime() - b.time.getTime())[0]

  if (upcoming) {
    return {
      id: upcoming.id,
      time: upcoming.time,
      basis: upcoming.basis,
      isTomorrow: false,
      msRemaining: upcoming.time.getTime() - now.getTime(),
    }
  }

  const tomorrow = getDayTimes(location, settings, addDays(now, 1))
  const fajr =
    tomorrow.entries.find((entry) => entry.id === "fajr") ??
    tomorrow.entries[0]

  return {
    id: fajr.id,
    time: fajr.time,
    basis: fajr.basis,
    isTomorrow: true,
    msRemaining: Math.max(0, fajr.time.getTime() - now.getTime()),
  }
}

/**
 * The prayer whose window currently contains `now`, or `null` before Fajr.
 * Sunrise is a moment rather than a window, so a time between sunrise and Dhuhr
 * still counts as being in the Fajr window having ended — `adhan` models this
 * by reporting `sunrise` as the current prayer, which we surface as-is so the
 * UI can highlight the right row.
 */
export function getCurrentPrayer(
  location: AppLocation,
  settings: Settings,
  now: Date
): PrayerId | null {
  const { coordinates, parameters } = buildParameters(location, settings)
  const times = new PrayerTimes(coordinates, now, parameters)
  const current = times.currentPrayer(now)
  return current === "none" ? null : current
}

/** Great-circle bearing from the location to the Kaaba, in degrees from true north. */
export function getQiblaBearing(location: AppLocation): number {
  return Qibla(toCoordinates(location))
}

export { isValidDate }
