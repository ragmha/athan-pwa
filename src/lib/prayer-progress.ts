import {
  prayerProgressSchema,
  readPersisted,
  STORAGE_KEYS,
  STORAGE_VERSION,
  writePersisted,
  type PrayerId,
} from "@/lib/schemas"

/** Returns a stable local-calendar key such as `2026-09-20`. */
export function prayerDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${String(year)}-${month}-${day}`
}

function storageKey(date: Date): string {
  return `${STORAGE_KEYS.prayerProgress}.${prayerDateKey(date)}`
}

export function readCompletedPrayers(date: Date): Set<PrayerId> {
  const progress = readPersisted(
    storageKey(date),
    prayerProgressSchema,
    { version: STORAGE_VERSION, completed: [] }
  )
  return new Set(progress.completed.filter((id) => id !== "sunrise"))
}

export function writeCompletedPrayers(
  date: Date,
  completed: Iterable<PrayerId>
): void {
  writePersisted(storageKey(date), {
    version: STORAGE_VERSION,
    completed: [...new Set(completed)],
  })
}
