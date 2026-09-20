import { Sunrise, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/format"
import { Checkbox } from "@/components/ui/checkbox"
import {
  isValidDate,
  PRAYER_LABELS,
  type DayTimes,
  type PrayerEntry,
  type PrayerId,
} from "@/lib/prayer-times"
import type { ClockFormat } from "@/lib/schemas"

export function PrayerList({
  day,
  currentPrayer,
  nextPrayer,
  clockFormat,
  completed,
  onToggle,
}: {
  day: DayTimes
  currentPrayer: PrayerId | null
  nextPrayer: PrayerId | null
  clockFormat: ClockFormat
  completed: ReadonlySet<PrayerId>
  onToggle: (prayer: PrayerId) => void
}) {
  return (
    <ul aria-label="Prayer times" className="flex flex-col">
      {day.entries.map((entry) => (
        <PrayerRow
          key={entry.id}
          entry={entry}
          isCurrent={entry.id === currentPrayer}
          isNext={entry.id === nextPrayer}
          clockFormat={clockFormat}
          completed={completed.has(entry.id)}
          onToggle={onToggle}
        />
      ))}
    </ul>
  )
}

function PrayerRow({
  entry,
  isCurrent,
  isNext,
  clockFormat,
  completed,
  onToggle,
}: {
  entry: PrayerEntry
  isCurrent: boolean
  isNext: boolean
  clockFormat: ClockFormat
  completed: boolean
  onToggle: (prayer: PrayerId) => void
}) {
  const label = PRAYER_LABELS[entry.id]
  const isSunrise = entry.id === "sunrise"
  const marker = basisMarker(entry)

  return (
    <li
      // `aria-current` rather than colour alone, so the active row is
      // announced and not merely highlighted.
      aria-current={isCurrent ? "time" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
        isCurrent && "bg-accent",
        isNext && !isCurrent && "bg-accent/40",
        completed && "opacity-70"
      )}
    >
      {isSunrise ? (
        <Sunrise className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            isCurrent ? "bg-primary" : "bg-muted-foreground/40"
          )}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate font-medium",
            isSunrise && "text-muted-foreground"
          )}
        >
          {label.en}
        </span>
        {marker && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <TriangleAlert className="size-3 shrink-0" aria-hidden />
            {marker}
          </span>
        )}
      </div>

      <span lang="ar" dir="rtl" className="text-sm text-muted-foreground">
        {label.ar}
      </span>

      <span
        className={cn(
          "tabular w-16 text-end font-semibold",
          isSunrise && "font-normal text-muted-foreground",
          !isValidDate(entry.time) && "text-muted-foreground"
        )}
      >
        {formatTime(entry.time, clockFormat)}
      </span>

      {isSunrise ? (
        <span className="size-4 shrink-0" aria-hidden />
      ) : (
        <Checkbox
          checked={completed}
          onCheckedChange={() => {
            onToggle(entry.id)
          }}
          aria-label={`Mark ${label.en} as ${
            completed ? "not completed" : "completed"
          }`}
        />
      )}
    </li>
  )
}

/**
 * The visible half of AGENTS.md §4.5: a time that was not observed must say so
 * on the row itself, not only in a footnote somebody may never scroll to.
 */
function basisMarker(entry: PrayerEntry): string | null {
  switch (entry.basis) {
    case "undefined":
      return "No true twilight — estimated"
    case "ruleAdjusted":
      return "Adjusted for high latitude"
    default:
      return null
  }
}
