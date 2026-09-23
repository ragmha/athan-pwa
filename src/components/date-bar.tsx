import { formatGregorian } from "@/lib/format"
import { formatHijri } from "@/lib/hijri"

export function DateBar({ date }: { date: Date }) {
  return (
    <section
      aria-label="Today's date"
      className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-start"
    >
      <p className="text-sm font-medium">{formatGregorian(date)}</p>
      <p className="text-sm text-muted-foreground">{formatHijri(date)}</p>
    </section>
  )
}
