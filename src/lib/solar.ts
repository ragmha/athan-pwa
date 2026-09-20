/**
 * Solar geometry helpers used to decide whether a prayer time is astronomically
 * observable at a given latitude and date.
 *
 * This matters because `adhan` always returns *a* time: when true twilight never
 * occurs it silently falls back to a night-portion rule. Without an independent
 * check we could not tell a real Fajr from a synthesised one, and AGENTS.md §4.5
 * requires us to tell the user which is which.
 */

const DEG = Math.PI / 180

/**
 * Apparent solar declination, in degrees, using the NOAA low-precision formula.
 * Accurate to roughly 0.01°, which is far finer than the several-degree margins
 * we compare against.
 */
export function solarDeclination(date: Date): number {
  // Days since the J2000.0 epoch (2000-01-01 12:00 UT).
  const n = date.getTime() / 86_400_000 - 10_957.5

  const meanLongitude = 280.46 + 0.985_647_4 * n
  const meanAnomaly = (357.528 + 0.985_600_3 * n) * DEG

  const eclipticLongitude =
    (meanLongitude +
      1.915 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly)) *
    DEG

  const obliquity = (23.439 - 0.000_000_4 * n) * DEG

  return (
    Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) / DEG
  )
}

/**
 * The sun's altitude at lower culmination (local solar midnight), in degrees.
 * This is the deepest the sun gets on a given night; if it is shallower than the
 * twilight angle a prayer depends on, that prayer simply does not occur.
 */
export function minimumSolarAltitude(latitude: number, date: Date): number {
  const declination = solarDeclination(date)
  return Math.abs(latitude + declination) - 90
}

/**
 * Whether the sun descends far enough below the horizon for a twilight-angle
 * based prayer to be observable.
 *
 * @param angle depression below the horizon the prayer requires, e.g. 18°
 */
export function twilightOccurs(
  latitude: number,
  date: Date,
  angle: number
): boolean {
  if (angle <= 0) return true
  return minimumSolarAltitude(latitude, date) <= -angle
}
