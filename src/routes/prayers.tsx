import { lazy, Suspense, useMemo, useState } from "react"
import { DateBar } from "@/components/date-bar"
import { HighLatitudeNote } from "@/components/high-latitude-note"
import { LocationHeader } from "@/components/location-header"
import { PrayerHero } from "@/components/prayer-hero"
import { PrayerList } from "@/components/prayer-list"
import { Button } from "@/components/ui/button"
import { TRACKED_PRAYER_IDS } from "@/lib/schemas"
import {
  getCurrentPrayer,
  getDayTimes,
  getNextPrayer,
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
    <div className="flex flex-col gap-5 px-4 pt-3 pb-6 sm:px-5">
      <div className="flex flex-col gap-1">
        <LocationHeader onSearch={() => setSearchOpen(true)} />
        <DateBar date={now} />
      </div>
      <PrayerHero
        day={day}
        now={now}
        next={next}
        clockFormat={settings.clockFormat}
        highLatitudeRule={settings.highLatitudeRule}
        showAdditionalTimes={settings.showAdditionalTimes}
      />

      <PrayerList
        day={day}
        currentPrayer={current}
        clockFormat={settings.clockFormat}
        completed={progress.completed}
        onToggle={(prayer) => void progress.toggle(prayer)}
        showAdditionalTimes={settings.showAdditionalTimes}
        disabled={!progress.ready || progress.saving}
      />

      <div className="flex flex-col gap-2">
        <div
          className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <p>
            {progress.loading
              ? "Loading prayer history…"
              : progress.ready
                ? `${progress.completedCount} of ${TRACKED_PRAYER_IDS.length} prayers completed`
                : "Prayer history unavailable"}
          </p>
          {progress.ready && (
            <p>
              {progress.saving ? "Saving…" : `${progress.streak}-day streak`}
            </p>
          )}
        </div>
        {progress.error && (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="text-xs text-destructive">{progress.error}</p>
            <Button
              variant="outline"
              onClick={progress.reload}
              disabled={progress.saving}
            >
              Retry
            </Button>
          </div>
        )}
        {progress.ready && progress.warning && (
          <p role="status" className="text-xs text-muted-foreground">
            {progress.warning}
          </p>
        )}
      </div>

      <HighLatitudeNote day={day} rule={settings.highLatitudeRule} />
      {searchOpen && (
        <Suspense fallback={null}>
          <CitySearch open onOpenChange={setSearchOpen} />
        </Suspense>
      )}
    </div>
  )
}
