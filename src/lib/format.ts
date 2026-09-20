import type { ClockFormat } from "@/lib/schemas"

/**
 * Formats a prayer time in the user's chosen clock format.
 *
 * We deliberately format in the *device's* timezone rather than the location's.
 * `adhan` returns absolute instants, so a user in Helsinki looking up Mecca's
 * times sees them on their own clock — which is what "when is Maghrib for me"
 * means. Travelling users get correct times as soon as the device clock updates.
 */
export function formatTime(date: Date, clockFormat: ClockFormat): string {
  if (!isValidDate(date)) return "--:--"

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: clockFormat === "12h",
  }).format(date)
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime())
}

/** `HH:MM:SS`, zero-padded, for the countdown. Clamps negatives to zero. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")
}

/**
 * A screen-reader-friendly duration: "2 hours 14 minutes".
 *
 * The visual countdown ticks every second, which would make an `aria-live`
 * region unbearable. We announce coarse, human units instead.
 */
export function describeDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`)
  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`)
  }

  return parts.join(" ")
}

export function formatGregorian(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

/** Fraction of the way from `start` to `end`, clamped to 0…1. */
export function progressBetween(start: Date, end: Date, now: Date): number {
  const span = end.getTime() - start.getTime()
  if (span <= 0) return 0

  const elapsed = now.getTime() - start.getTime()
  return Math.min(1, Math.max(0, elapsed / span))
}
