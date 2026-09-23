import { useId } from "react"
import { TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/format"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getVisiblePrayerEntries,
  isValidDate,
  PRAYER_LABELS,
  PRAYER_BASIS_LABELS,
  type DayTimes,
  type PrayerEntry,
  type PrayerId,
} from "@/lib/prayer-times"
import {
  isTrackedPrayer,
  type ClockFormat,
  type TrackedPrayerId,
} from "@/lib/schemas"

export function PrayerList({
  day,
  currentPrayer,
  clockFormat,
  completed,
  onToggle,
  showAdditionalTimes,
  disabled,
}: {
  day: DayTimes
  currentPrayer: PrayerId | null
  clockFormat: ClockFormat
  completed: ReadonlySet<TrackedPrayerId>
  onToggle: (prayer: TrackedPrayerId) => void
  showAdditionalTimes: boolean
  disabled: boolean
}) {
  return (
    <ul aria-label="Prayer times" className="flex flex-col gap-2">
      {getVisiblePrayerEntries(day, showAdditionalTimes).map((entry) => (
        <PrayerRow
          key={entry.id}
          entry={entry}
          isCurrent={entry.id === currentPrayer}
          clockFormat={clockFormat}
          completed={isTrackedPrayer(entry.id) && completed.has(entry.id)}
          onToggle={onToggle}
          disabled={disabled}
        />
      ))}
    </ul>
  )
}

function PrayerRow({
  entry,
  isCurrent,
  clockFormat,
  completed,
  onToggle,
  disabled,
}: {
  entry: PrayerEntry
  isCurrent: boolean
  clockFormat: ClockFormat
  completed: boolean
  onToggle: (prayer: TrackedPrayerId) => void
  disabled: boolean
}) {
  const checkboxId = useId()
  const prayer = entry.id
  const label = PRAYER_LABELS[entry.id]
  const tracked = isTrackedPrayer(prayer)
  const marker = PRAYER_BASIS_LABELS[entry.basis]
  const completionLabel = `Mark ${label.en} as ${
    completed ? "not completed" : "completed"
  }`

  return (
    <li
      // `aria-current` rather than colour alone, so the active row is
      // announced and not merely highlighted.
      aria-current={isCurrent ? "time" : undefined}
      className={cn(
        "grid min-h-14 grid-cols-[minmax(0,1fr)_max-content_2.75rem] items-center gap-x-3 rounded-lg border-2 border-border bg-card ps-4 pe-2 transition-colors",
        isCurrent && "border-foreground/75"
      )}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 py-1">
        <span
          className={cn(
            "text-lg font-medium",
            isCurrent && "font-semibold",
            (!tracked || completed) && "text-muted-foreground"
          )}
        >
          {label.en}
        </span>
        <span lang="ar" dir="rtl" className="text-sm text-muted-foreground">
          {label.ar}
        </span>
      </div>

      <span
        className={cn(
          "text-end text-lg font-semibold whitespace-nowrap tabular",
          !tracked && "font-normal text-muted-foreground",
          completed && "text-muted-foreground",
          !isValidDate(entry.time) && "text-muted-foreground"
        )}
      >
        {formatTime(entry.time, clockFormat)}
      </span>

      {tracked ? (
        <label
          htmlFor={checkboxId}
          className={cn(
            "flex size-11 items-center justify-center",
            !disabled && "cursor-pointer"
          )}
        >
          <Checkbox
            id={checkboxId}
            className="size-5"
            checked={completed}
            disabled={disabled}
            onCheckedChange={() => {
              onToggle(prayer)
            }}
          />
          <span className="sr-only">{completionLabel}</span>
        </label>
      ) : (
        <span className="size-11" aria-hidden />
      )}

      {marker && (
        <span className="col-span-full flex items-start gap-1 pe-2 pb-2 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
          {marker}
        </span>
      )}
    </li>
  )
}
