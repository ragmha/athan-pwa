import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePrayerProgress } from "@/hooks/use-prayer-progress"
import { readPrayerHistory, setPrayerCompleted } from "@/lib/prayer-history"
import type { PrayerDayProgress } from "@/lib/schemas"

vi.mock("@/lib/prayer-history", () => ({
  readPrayerHistory: vi.fn(),
  setPrayerCompleted: vi.fn(),
}))

function deferred<T>() {
  let finish: ((value: T) => void) | undefined
  const promise = new Promise<T>((resolve) => {
    finish = resolve
  })
  return {
    promise,
    resolve(value: T) {
      if (!finish) throw new Error("Deferred promise was not initialized")
      finish(value)
    },
  }
}

describe("asynchronous prayer progress", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(readPrayerHistory).mockResolvedValue({ days: [], warning: null })
  })

  it("ignores a previous day's load that finishes after midnight", async () => {
    const previous = deferred<Awaited<ReturnType<typeof readPrayerHistory>>>()
    vi.mocked(readPrayerHistory).mockReturnValueOnce(previous.promise)
    const { result, rerender } = renderHook(
      ({ date }) => usePrayerProgress(date),
      { initialProps: { date: new Date(2026, 8, 20) } }
    )

    rerender({ date: new Date(2026, 8, 21) })
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => {
      previous.resolve({
        days: [{ version: 1, dateKey: "2026-09-20", completed: ["fajr"] }],
        warning: null,
      })
      await previous.promise
    })

    expect(result.current.ready).toBe(true)
    expect(result.current.completed.size).toBe(0)
  })

  it("saves to the clicked date without leaking checkmarks into the new day", async () => {
    const write = deferred<PrayerDayProgress>()
    vi.mocked(setPrayerCompleted).mockReturnValueOnce(write.promise)
    const { result, rerender } = renderHook(
      ({ date }) => usePrayerProgress(date),
      { initialProps: { date: new Date(2026, 8, 20) } }
    )
    await waitFor(() => expect(result.current.ready).toBe(true))

    let pending = Promise.resolve()
    act(() => {
      pending = result.current.toggle("fajr")
      void result.current.toggle("fajr")
    })
    expect(setPrayerCompleted).toHaveBeenCalledExactlyOnceWith(
      "2026-09-20",
      "fajr",
      true
    )
    expect(result.current.saving).toBe(true)

    vi.mocked(readPrayerHistory).mockResolvedValueOnce({
      days: [{ version: 1, dateKey: "2026-09-21", completed: ["isha"] }],
      warning: null,
    })
    rerender({ date: new Date(2026, 8, 21) })
    await waitFor(() => expect(result.current.ready).toBe(true))

    await act(async () => {
      write.resolve({ version: 1, dateKey: "2026-09-20", completed: ["fajr"] })
      await pending
    })
    expect([...result.current.completed]).toEqual(["isha"])
    expect(result.current.saving).toBe(false)
  })
})
