import { TriangleAlert } from "lucide-react"
import { DayTimeline } from "@/components/day-timeline"
import { describeDuration, formatTime } from "@/lib/format"
import { HIGH_LATITUDE_RULE_LABELS } from "@/lib/method-map"
import {
  PRAYER_BASIS_LABELS,
  PRAYER_LABELS,
  type DayTimes,
  type NextPrayer,
} from "@/lib/prayer-times"
import type { ClockFormat, HighLatitudeRuleKey } from "@/lib/schemas"

export function PrayerHero({
  day,
  now,
  next,
  clockFormat,
  highLatitudeRule,
  showAdditionalTimes,
}: {
  day: DayTimes
  now: Date
  next: NextPrayer
  clockFormat: ClockFormat
  highLatitudeRule: HighLatitudeRuleKey
  showAdditionalTimes: boolean
}) {
  const label = PRAYER_LABELS[next.id]
  const marker = PRAYER_BASIS_LABELS[next.basis]

  return (
    <section aria-label="Prayer overview" className="flex flex-col gap-3">
      <div
        data-slot="next-prayer-panel"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-sky p-4"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-balance">
            Next: {label.en}
          </h1>
          <p lang="ar" dir="rtl" className="text-3xl">
            {label.ar}
          </p>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p
            data-slot="next-prayer-time"
            className="text-4xl font-semibold tabular"
          >
            {formatTime(next.time, clockFormat)}
          </p>
          <p className="text-sm text-muted-foreground">
            {next.isTomorrow ? "Tomorrow" : "Today"}
          </p>
        </div>
        <p className="text-sm text-muted-foreground" aria-hidden>
          In {describeDuration(next.msRemaining)}
        </p>
        <output className="sr-only">
          {next.isTomorrow ? "Tomorrow's " : ""}
          {label.en} in {describeDuration(next.msRemaining)}, at{" "}
          {formatTime(next.time, clockFormat)}.
        </output>
        {marker && (
          <p className="flex items-start gap-1 text-xs text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span>
              {marker}. {HIGH_LATITUDE_RULE_LABELS[highLatitudeRule]}.
            </span>
          </p>
        )}
      </div>
      <DayTimeline
        day={day}
        now={now}
        clockFormat={clockFormat}
        showAdditionalTimes={showAdditionalTimes}
      />
    </section>
  )
}
