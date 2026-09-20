import { Info } from "lucide-react"
import { HIGH_LATITUDE_RULE_LABELS } from "@/lib/method-map"
import type { DayTimes } from "@/lib/prayer-times"
import type { HighLatitudeRuleKey } from "@/lib/schemas"

/**
 * Explains, in plain language, why some times on screen carry a marker.
 *
 * At Helsinki's latitude this is not an edge case — it is most of the year — so
 * the note has to be genuinely informative rather than a generic disclaimer.
 */
export function HighLatitudeNote({
  day,
  rule,
}: {
  day: DayTimes
  rule: HighLatitudeRuleKey
}) {
  if (!day.hasApproximation) return null

  const undefinedPrayers = day.entries.filter(
    (entry) => entry.basis === "undefined"
  )

  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        {undefinedPrayers.length > 0 ? (
          <>
            At this latitude the sky never darkens enough today for{" "}
            {listNames(undefinedPrayers.map((entry) => entry.id))}, so{" "}
            {undefinedPrayers.length === 1 ? "its time is" : "these times are"}{" "}
            estimated.
          </>
        ) : (
          <>Some times today were shifted to keep the night a sensible length.</>
        )}{" "}
        Method:{" "}
        <span className="font-medium text-foreground">
          {HIGH_LATITUDE_RULE_LABELS[rule]}
        </span>
        . You can change this in Settings.
      </p>
    </div>
  )
}

function listNames(ids: string[]): string {
  const names = ids.map((id) => id.charAt(0).toUpperCase() + id.slice(1))
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`
}
