import { useEffect, useState } from "react"

/**
 * A ticking clock.
 *
 * Two things make this less trivial than `setInterval`:
 *
 * 1. **Background throttling.** Browsers throttle timers in hidden tabs, and
 *    iOS suspends them outright when a PWA is backgrounded. Returning to the
 *    app would otherwise show a countdown frozen at the moment you left, which
 *    is exactly when a prayer-time app must be right. We resync on
 *    `visibilitychange`.
 * 2. **Second alignment.** We schedule the first tick on the next whole second
 *    so the countdown changes in step with the system clock instead of drifting
 *    by a fraction of a second.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    let alignment: ReturnType<typeof setTimeout> | undefined

    const tick = () => {
      setNow(new Date())
    }

    const start = () => {
      tick()
      const msToNextBoundary = intervalMs - (Date.now() % intervalMs)
      alignment = setTimeout(() => {
        tick()
        interval = setInterval(tick, intervalMs)
      }, msToNextBoundary)
    }

    const stop = () => {
      if (alignment) clearTimeout(alignment)
      if (interval) clearInterval(interval)
      alignment = undefined
      interval = undefined
    }

    const onVisibilityChange = () => {
      stop()
      if (document.visibilityState === "visible") start()
    }

    start()
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [intervalMs])

  return now
}

/** Ticks once a minute — for date headers that do not need second precision. */
export function useMinute(): Date {
  return useNow(60_000)
}
