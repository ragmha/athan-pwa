/**
 * Hijri date formatting.
 *
 * `Intl` ships the Umm al-Qura calendar natively, so this needs no data and no
 * network. Umm al-Qura is the civil calendar of Saudi Arabia and the usual
 * default in prayer apps.
 *
 * Caveat worth stating plainly: Umm al-Qura is *calculated*, while many
 * communities begin the month on local moon sighting. A one-day difference is
 * normal and expected, which is why the UI offers a manual offset rather than
 * pretending the computed date is authoritative.
 */

const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
] as const

export interface HijriDate {
  day: number
  /** 1-based. */
  month: number
  year: number
  monthName: string
}

/**
 * @param offsetDays Manual correction, typically -1…+1, for communities that
 *   follow local sighting rather than the calculated calendar.
 */
export function toHijri(date: Date, offsetDays = 0): HijriDate {
  const shifted = new Date(date.getTime())
  shifted.setDate(shifted.getDate() + offsetDays)

  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(
    // Normalise to UTC noon first. Formatting a local-midnight instant in the
    // UTC timezone would roll the date backwards for any positive offset.
    Date.UTC(
      shifted.getFullYear(),
      shifted.getMonth(),
      shifted.getDate(),
      12
    )
  )

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(
      parts.find((part) => part.type === type)?.value ?? "0",
      10
    )

  const month = read("month")

  return {
    day: read("day"),
    month,
    year: read("year"),
    monthName: HIJRI_MONTHS[month - 1] ?? "",
  }
}

export function formatHijri(date: Date, offsetDays = 0): string {
  const hijri = toHijri(date, offsetDays)
  return `${String(hijri.day)} ${hijri.monthName} ${String(hijri.year)} AH`
}
