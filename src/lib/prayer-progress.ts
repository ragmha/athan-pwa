import { TRACKED_PRAYER_IDS, type PrayerDayProgress } from "@/lib/schemas"

/** Returns a stable local-calendar key such as `2026-09-20`. */
export function prayerDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Prayer progress requires a valid date")
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${String(year)}-${month}-${day}`
}

export function getPrayerStreak(
  history: readonly PrayerDayProgress[],
  now: Date
): number {
  const completeDays = new Set(
    history
      .filter((day) =>
        TRACKED_PRAYER_IDS.every((prayer) => day.completed.includes(prayer))
      )
      .map((day) => day.dateKey)
  )
  const cursor = new Date(now)
  cursor.setHours(12, 0, 0, 0)

  // An unfinished today does not break yesterday's streak. Calendar arithmetic
  // rather than 24-hour durations keeps the count correct through DST changes.
  if (!completeDays.has(prayerDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (completeDays.has(prayerDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
