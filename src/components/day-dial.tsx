import { useId } from "react"
import { cn } from "@/lib/utils"
import { isValidDate, type DayTimes } from "@/lib/prayer-times"

/**
 * A 24-hour dial of the day.
 *
 * Midnight sits at the bottom and noon at the top, so the sun's position on the
 * ring matches where it actually is in the sky — it climbs the right-hand side
 * through the morning and descends the left through the afternoon. The lit arc
 * spans Sunrise to Maghrib.
 *
 * The whole thing is decorative: it carries `aria-hidden`, and the surrounding
 * card states the same information as text (AGENTS.md §6).
 */

const SIZE = 264
const CENTRE = SIZE / 2
const RADIUS = 112
const TRACK_WIDTH = 10

export function DayDial({
  day,
  now,
  className,
  children,
}: {
  day: DayTimes
  now: Date
  className?: string
  children?: React.ReactNode
}) {
  const gradientId = useId()

  const sunrise = day.entries.find((entry) => entry.id === "sunrise")?.time
  const maghrib = day.entries.find((entry) => entry.id === "maghrib")?.time

  const hasDaylightArc =
    sunrise !== undefined &&
    maghrib !== undefined &&
    isValidDate(sunrise) &&
    isValidDate(maghrib)

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <svg
        viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
        className="size-[17rem] max-w-full"
        aria-hidden
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--color-daylight)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>

        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={TRACK_WIDTH}
        />

        {hasDaylightArc && (
          <path
            d={arcPath(fractionOfDay(sunrise), fractionOfDay(maghrib))}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={TRACK_WIDTH}
            strokeLinecap="round"
          />
        )}

        <HourTicks />

        {day.entries
          .filter((entry) => isValidDate(entry.time))
          .map((entry) => (
            <PrayerTick
              key={entry.id}
              fraction={fractionOfDay(entry.time)}
              muted={entry.basis !== "observed"}
            />
          ))}

        <NowMarker fraction={fractionOfDay(now)} />
      </svg>

      <div className="absolute inset-0 grid place-items-center px-14 text-center">
        {children}
      </div>
    </div>
  )
}

function HourTicks() {
  return (
    <g stroke="var(--color-muted-foreground)" opacity={0.35}>
      {Array.from({ length: 24 }, (_, hour) => {
        const major = hour % 6 === 0
        const outer = RADIUS - TRACK_WIDTH / 2 - 4
        const inner = outer - (major ? 9 : 5)
        const start = pointOnCircle(hour / 24, inner)
        const end = pointOnCircle(hour / 24, outer)

        return (
          <line
            key={hour}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            strokeWidth={major ? 2 : 1}
            strokeLinecap="round"
          />
        )
      })}
    </g>
  )
}

function PrayerTick({
  fraction,
  muted,
}: {
  fraction: number
  muted: boolean
}) {
  const { x, y } = pointOnCircle(fraction, RADIUS)

  return (
    <circle
      cx={x}
      cy={y}
      r={3.5}
      fill="var(--color-background)"
      stroke="var(--color-primary)"
      strokeWidth={2}
      strokeDasharray={muted ? "2 2" : undefined}
    />
  )
}

function NowMarker({ fraction }: { fraction: number }) {
  const { x, y } = pointOnCircle(fraction, RADIUS)

  return (
    <g>
      <circle cx={x} cy={y} r={9} fill="var(--color-primary)" opacity={0.2} />
      <circle
        cx={x}
        cy={y}
        r={5}
        fill="var(--color-primary)"
        stroke="var(--color-background)"
        strokeWidth={2}
      />
    </g>
  )
}

/** Fraction of the local day elapsed, 0 at midnight and 1 at the next. */
function fractionOfDay(date: Date): number {
  const midnight = new Date(date)
  midnight.setHours(0, 0, 0, 0)
  return ((date.getTime() - midnight.getTime()) / 86_400_000) % 1
}

/**
 * Maps a day fraction to a point on the ring. Midnight is at the bottom and
 * noon at the top; the path sweeps up the right-hand side so that, with north
 * up, the sun sits east in the morning and west in the afternoon.
 */
function pointOnCircle(fraction: number, radius: number) {
  const angle = fraction * 2 * Math.PI - Math.PI / 2
  return {
    x: CENTRE + radius * Math.cos(angle),
    y: CENTRE - radius * Math.sin(angle),
  }
}

function arcPath(from: number, to: number): string {
  const start = pointOnCircle(from, RADIUS)
  const end = pointOnCircle(to, RADIUS)
  const sweep = (to - from + 1) % 1
  const largeArc = sweep > 0.5 ? 1 : 0

  return [
    `M ${String(start.x)} ${String(start.y)}`,
    `A ${String(RADIUS)} ${String(RADIUS)} 0 ${String(largeArc)} 0 ${String(end.x)} ${String(end.y)}`,
  ].join(" ")
}
