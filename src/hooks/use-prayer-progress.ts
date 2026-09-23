import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { readPrayerHistory, setPrayerCompleted } from "@/lib/prayer-history"
import { getPrayerStreak, prayerDateKey } from "@/lib/prayer-progress"
import type { PrayerDayProgress, TrackedPrayerId } from "@/lib/schemas"

type ProgressState = {
  phase: "loading" | "ready" | "error"
  dateKey: string | null
  revision: number
  days: PrayerDayProgress[]
  saving: boolean
  error: string | null
  warning: string | null
}

export function usePrayerProgress(date: Date) {
  const dateKey = prayerDateKey(date)
  const [state, setState] = useState<ProgressState>({
    phase: "loading",
    dateKey: null,
    revision: -1,
    days: [],
    saving: false,
    error: null,
    warning: null,
  })
  const [revision, setRevision] = useState(0)
  const inFlight = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void readPrayerHistory().then(
      ({ days, warning }) => {
        if (active) {
          setState((current) => ({
            ...current,
            phase: "ready",
            dateKey,
            revision,
            days,
            warning,
            error: null,
          }))
        }
        return undefined
      },
      (error: unknown) => {
        console.warn("Could not load prayer history", error)
        if (active) {
          setState((current) => ({
            ...current,
            phase: "error",
            dateKey,
            revision,
            error: historyError("Could not load prayer history.", error),
          }))
        }
        return undefined
      }
    )
    return () => {
      active = false
    }
  }, [dateKey, revision])

  const completed = useMemo(
    () => new Set(state.days.find((day) => day.dateKey === dateKey)?.completed),
    [state.days, dateKey]
  )
  const streak = useMemo(
    () => getPrayerStreak(state.days, date),
    [state.days, date]
  )
  const isCurrentLoad = state.dateKey === dateKey && state.revision === revision
  const ready = state.phase === "ready" && isCurrentLoad

  const toggle = useCallback(
    async (prayer: TrackedPrayerId) => {
      if (inFlight.current || !ready) return
      inFlight.current = true
      setState((current) => ({ ...current, saving: true, error: null }))
      try {
        const day = await setPrayerCompleted(
          dateKey,
          prayer,
          !completed.has(prayer)
        )
        if (mounted.current) {
          setState((current) => ({
            ...current,
            days: [
              ...current.days.filter((entry) => entry.dateKey !== day.dateKey),
              day,
            ],
          }))
        }
      } catch (error) {
        console.warn("Could not save prayer progress", error)
        if (mounted.current) {
          setState((current) => ({
            ...current,
            error: historyError(
              "Could not save this change. Your checkmarks have not changed.",
              error
            ),
          }))
        }
      } finally {
        inFlight.current = false
        if (mounted.current) {
          setState((current) => ({ ...current, saving: false }))
        }
      }
    },
    [completed, dateKey, ready]
  )

  const reload = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  return {
    completed,
    completedCount: completed.size,
    streak,
    ready,
    loading: state.phase === "loading" || !isCurrentLoad,
    saving: state.saving,
    error: isCurrentLoad ? state.error : null,
    warning: isCurrentLoad ? state.warning : null,
    toggle,
    reload,
  }
}

function historyError(message: string, error: unknown): string {
  return error instanceof Error ? `${message} ${error.message}` : message
}
