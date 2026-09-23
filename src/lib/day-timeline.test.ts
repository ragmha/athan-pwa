import { describe, expect, it } from "vitest"
import { dayProgress, timelinePoint } from "@/lib/day-timeline"

describe("day timeline", () => {
  it.each([
    [0, 12, 18],
    [0.125, 59, 18],
    [0.25, 106, 18],
    [0.5, 200, 18],
    [0.75, 294, 18],
    [1, 388, 18],
  ])("places progress %s on the linear day strip", (progress, x, y) => {
    expect(timelinePoint(progress)).toEqual({ x, y })
  })

  it("keeps off-day markers at the ends of the timeline", () => {
    expect(timelinePoint(-1)).toEqual(timelinePoint(0))
    expect(timelinePoint(2)).toEqual(timelinePoint(1))
  })

  it("uses the local calendar day's bounds", () => {
    const date = new Date(2026, 8, 20)
    expect(dayProgress(date, new Date(2026, 8, 20, 12))).toBe(0.5)
    expect(dayProgress(date, new Date(2026, 8, 19, 23))).toBe(0)
    expect(dayProgress(date, new Date(2026, 8, 21, 1))).toBe(1)
  })

  it.each(["2026-03-29", "2026-10-25"])(
    "uses elapsed time across the DST day %s",
    (key) => {
      const start = new Date(`${key}T00:00:00`)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      const halfway = new Date((start.getTime() + end.getTime()) / 2)
      expect(dayProgress(start, halfway)).toBe(0.5)
    }
  )

  it("rejects invalid dates and non-finite progress", () => {
    const invalid = new Date(Number.NaN)
    expect(() => dayProgress(invalid, new Date(2026, 8, 20))).toThrow(
      RangeError
    )
    expect(() => dayProgress(new Date(2026, 8, 20), invalid)).toThrow(
      RangeError
    )
    expect(() => timelinePoint(Number.NaN)).toThrow(RangeError)
  })
})
