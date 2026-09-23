import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import {
  isTrackedPrayer,
  legacyPrayerProgressSchema,
  prayerDayProgressSchema,
  STORAGE_KEYS,
  STORAGE_VERSION,
  TRACKED_PRAYER_IDS,
  type PrayerDayProgress,
  type TrackedPrayerId,
} from "@/lib/schemas"

interface PrayerHistoryDatabase extends DBSchema {
  days: { key: string; value: unknown }
}

function openHistory(): Promise<IDBPDatabase<PrayerHistoryDatabase>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error(
        "IndexedDB is unavailable. Enable website storage and try again."
      )
    )
  }

  return new Promise((resolve, reject) => {
    let blocked = false
    void openDB<PrayerHistoryDatabase>("athan-prayer-history", 1, {
      upgrade(database) {
        database.createObjectStore("days", { keyPath: "dateKey" })
      },
      blocked() {
        blocked = true
        reject(
          new Error("Close other Athan tabs, then retry loading your history.")
        )
      },
    }).then((database) => {
      if (blocked) return database.close()
      return resolve(database)
    }, reject)
  })
}

function readLegacyHistory() {
  const days: PrayerDayProgress[] = []
  let warning: string | null = null
  const prefix = `${STORAGE_KEYS.prayerProgress}.`

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith(prefix)) continue
      const raw = localStorage.getItem(key)
      if (raw === null) continue

      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error
        warning = "Some older prayer history could not be imported."
        continue
      }

      const legacy = legacyPrayerProgressSchema.safeParse(value)
      if (!legacy.success) {
        warning = "Some older prayer history could not be imported."
        continue
      }
      const parsed = prayerDayProgressSchema.safeParse({
        version: STORAGE_VERSION,
        dateKey: key.slice(prefix.length),
        completed: legacy.data.completed.filter(isTrackedPrayer),
      })
      if (parsed.success) days.push(parsed.data)
      else warning = "Some older prayer history could not be imported."
    }
  } catch (error) {
    console.warn("Could not read legacy prayer history", error)
    warning = "Older prayer history is unavailable and has not been imported."
  }
  return { days, warning }
}

export async function readPrayerHistory() {
  const legacy = readLegacyHistory()
  const database = await openHistory()

  try {
    const transaction = database.transaction("days", "readwrite")
    const migrate = async () => {
      const existing = new Set(await transaction.store.getAllKeys())
      // Keep the legacy copy as a backup, but never let it overwrite a newer
      // IndexedDB record, including a day whose checkmarks were all removed.
      await Promise.all(
        legacy.days
          .filter((day) => !existing.has(day.dateKey))
          .map((day) => transaction.store.add(day))
      )
      return transaction.store.getAll()
    }
    const [values] = await Promise.all([migrate(), transaction.done])
    const days: PrayerDayProgress[] = []
    const warnings = legacy.warning ? [legacy.warning] : []
    let corrupt = false

    for (const value of values) {
      const parsed = prayerDayProgressSchema.safeParse(value)
      if (parsed.success) days.push(parsed.data)
      else corrupt = true
    }
    if (corrupt) warnings.push("Some saved prayer history could not be read.")
    const warning = warnings.length > 0 ? warnings.join(" ") : null
    if (warning) console.warn(warning)
    return { days, warning }
  } finally {
    database.close()
  }
}

export async function setPrayerCompleted(
  dateKey: string,
  prayer: TrackedPrayerId,
  checked: boolean
): Promise<PrayerDayProgress> {
  const intent = prayerDayProgressSchema.safeParse({
    version: STORAGE_VERSION,
    dateKey,
    completed: [prayer],
  })
  if (!intent.success)
    throw new Error("The prayer or calendar date is invalid.")

  const database = await openHistory()
  try {
    const transaction = database.transaction("days", "readwrite")
    const update = async () => {
      const value = await transaction.store.get(dateKey)
      const parsed = prayerDayProgressSchema.safeParse(
        value === undefined
          ? { version: STORAGE_VERSION, dateKey, completed: [] }
          : value
      )
      if (!parsed.success) {
        throw new Error(
          "This day's saved progress could not be read and was not changed."
        )
      }

      // Read and merge inside one transaction so simultaneous tabs cannot
      // discard each other's changes to different prayers.
      const completed = new Set(parsed.data.completed)
      if (checked) completed.add(prayer)
      else completed.delete(prayer)
      const day: PrayerDayProgress = {
        version: STORAGE_VERSION,
        dateKey,
        completed: TRACKED_PRAYER_IDS.filter((id) => completed.has(id)),
      }
      await transaction.store.put(day)
      return day
    }
    const [day] = await Promise.all([update(), transaction.done])
    return day
  } finally {
    database.close()
  }
}
