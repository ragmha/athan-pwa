import { useId } from "react"
import {
  dayProgress,
  timelinePoint,
  TIMELINE_HEIGHT,
  TIMELINE_PATH,
  TIMELINE_WIDTH,
} from "@/lib/day-timeline"
import { formatTime } from "@/lib/format"
import {
  getVisiblePrayerEntries,
  isValidDate,
  type DayTimes,
} from "@/lib/prayer-times"
import type { ClockFormat } from "@/lib/schemas"

export function DayTimeline({
  day,
  now,
  clockFormat,
  showAdditionalTimes,
}: {
  day: DayTimes
  now: Date
  clockFormat: ClockFormat
  showAdditionalTimes: boolean
}) {
  const clipId = useId()
  const progress = dayProgress(day.date, now)
  const elapsedWidth =
    progress === 0
      ? 0
      : progress === 1
        ? TIMELINE_WIDTH
        : timelinePoint(progress).x

  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <span>Day progress</span>
        <span className="tabular">Now {formatTime(now, clockFormat)}</span>
      </figcaption>
      <svg
        data-slot="day-timeline"
        viewBox={`0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}`}
        className="block h-auto w-full rtl:-scale-x-100"
        aria-hidden
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <rect width={elapsedWidth} height={TIMELINE_HEIGHT} />
          </clipPath>
        </defs>
        <path
          d={TIMELINE_PATH}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={TIMELINE_PATH}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="4"
          strokeLinecap="round"
          clipPath={`url(#${clipId})`}
        />
        {getVisiblePrayerEntries(day, showAdditionalTimes)
          .filter((entry) => isValidDate(entry.time))
          .map((entry) => {
            const point = timelinePoint(dayProgress(day.date, entry.time))
            const passed = entry.time.getTime() <= now.getTime()
            return (
              <circle
                key={entry.id}
                data-prayer-id={entry.id}
                cx={point.x}
                cy={point.y}
                r="5.5"
                fill={
                  passed ? "var(--color-primary)" : "var(--color-background)"
                }
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeDasharray={entry.basis !== "observed" ? "2 2" : undefined}
              />
            )
          })}
      </svg>
    </figure>
  )
}
