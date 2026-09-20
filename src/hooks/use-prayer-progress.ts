import { useCallback, useMemo, useState } from "react"
import {
  prayerDateKey,
  readCompletedPrayers,
  writeCompletedPrayers,
} from "@/lib/prayer-progress"
import type { PrayerId } from "@/lib/schemas"

export function usePrayerProgress(date: Date) {
  const dateKey = prayerDateKey(date)
  const [state, setState] = useState(() => ({
    dateKey,
    completed: readCompletedPrayers(date),
  }))
  const completed =
    state.dateKey === dateKey ? state.completed : readCompletedPrayers(date)

  const toggle = useCallback(
    (prayer: PrayerId) => {
      setState((current) => {
        const next = new Set(
          current.dateKey === dateKey
            ? current.completed
            : readCompletedPrayers(date)
        )
        if (next.has(prayer)) {
          next.delete(prayer)
        } else {
          next.add(prayer)
        }
        writeCompletedPrayers(date, next)
        return { dateKey, completed: next }
      })
    },
    [date, dateKey]
  )

  return useMemo(
    () => ({
      completed,
      completedCount: [...completed].filter((id) => id !== "sunrise").length,
      toggle,
      dateKey,
    }),
    [completed, dateKey, toggle]
  )
}
