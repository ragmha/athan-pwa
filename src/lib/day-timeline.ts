import { progressBetween } from "@/lib/format"

export const TIMELINE_WIDTH = 400
export const TIMELINE_HEIGHT = 36
const INSET = 12
const SPAN = TIMELINE_WIDTH - INSET * 2

export const TIMELINE_PATH = `M ${INSET} ${TIMELINE_HEIGHT / 2} H ${TIMELINE_WIDTH - INSET}`

export function dayProgress(date: Date, instant: Date): number {
  if (Number.isNaN(date.getTime()) || Number.isNaN(instant.getTime())) {
    throw new RangeError("The day timeline requires valid dates")
  }
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return progressBetween(start, end, instant)
}

export function timelinePoint(fraction: number) {
  if (!Number.isFinite(fraction)) {
    throw new RangeError("Timeline progress must be finite")
  }
  const progress = Math.max(0, Math.min(1, fraction))
  return {
    x: INSET + progress * SPAN,
    y: TIMELINE_HEIGHT / 2,
  }
}
