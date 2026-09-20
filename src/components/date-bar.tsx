import { formatGregorian } from "@/lib/format"
import { formatHijri } from "@/lib/hijri"

export function DateBar({ date }: { date: Date }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <p className="text-sm font-medium">{formatGregorian(date)}</p>
      <p className="text-sm text-muted-foreground">{formatHijri(date)}</p>
    </div>
  )
}
