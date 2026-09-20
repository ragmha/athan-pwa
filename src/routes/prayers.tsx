import { lazy, Suspense, useMemo, useState } from "react"
import { DateBar } from "@/components/date-bar"
import { DayDial } from "@/components/day-dial"
import { HighLatitudeNote } from "@/components/high-latitude-note"
import { LocationHeader } from "@/components/location-header"
import { PrayerList } from "@/components/prayer-list"
import { Separator } from "@/components/ui/separator"
import { describeDuration, formatDuration, formatTime } from "@/lib/format"
import {
  getCurrentPrayer,
  getDayTimes,
  getNextPrayer,
  PRAYER_LABELS,
} from "@/lib/prayer-times"
import { useNow } from "@/hooks/use-now"
import { useAppState } from "@/hooks/use-app-state"
import { usePrayerProgress } from "@/hooks/use-prayer-progress"

// The command palette pulls in a sizeable dependency for a dialog most sessions
// never open, so it is only fetched once the user asks to change location.
const CitySearch = lazy(async () => ({
  default: (await import("@/components/city-search")).CitySearch,
}))

export function PrayersRoute() {
  const { location, settings } = useAppState()
  const now = useNow()
  const [searchOpen, setSearchOpen] = useState(false)

  // Recomputing on every tick would hand React a new object each second and
  // rerender the whole list. The day's times only change at midnight, so key
  // the memo on the calendar date rather than the instant.
  const dayKey = now.toDateString()
  const day = useMemo(
    () => getDayTimes(location, settings, new Date(dayKey)),
    [location, settings, dayKey]
  )
  const progress = usePrayerProgress(day.date)

  const next = getNextPrayer(location, settings, now)
  const current = getCurrentPrayer(location, settings, now)

  return (
    <div className="flex flex-col gap-6 px-5 pt-4 pb-8">
      <LocationHeader
        onSearch={() => {
          setSearchOpen(true)
        }}
      />

      <DayDial day={day} now={now}>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {next.isTomorrow ? "Tomorrow" : "Next"}
          </p>
          <p className="text-xl font-semibold">{PRAYER_LABELS[next.id].en}</p>
          <p
            className="tabular text-3xl font-bold text-primary"
            // The visible countdown changes every second; announcing that would
            // be intolerable, so the accessible text below is coarse and stable.
            aria-hidden
          >
            {formatDuration(next.msRemaining)}
          </p>
          <output className="sr-only">
            {PRAYER_LABELS[next.id].en} in {describeDuration(next.msRemaining)},
            at {formatTime(next.time, settings.clockFormat)}
          </output>
          <p className="text-sm text-muted-foreground">
            at {formatTime(next.time, settings.clockFormat)}
          </p>
        </div>
      </DayDial>

      <DateBar date={now} />

      <Separator />

      <PrayerList
        day={day}
        currentPrayer={current}
        nextPrayer={next.isTomorrow ? null : next.id}
        clockFormat={settings.clockFormat}
        completed={progress.completed}
        onToggle={progress.toggle}
      />

      <p className="text-center text-xs text-muted-foreground" aria-live="polite">
        {progress.completedCount} of 6 tracked prayers completed
      </p>

      <HighLatitudeNote day={day} rule={settings.highLatitudeRule} />

      {searchOpen && (
        <Suspense fallback={null}>
          <CitySearch open onOpenChange={setSearchOpen} />
        </Suspense>
      )}
    </div>
  )
}
