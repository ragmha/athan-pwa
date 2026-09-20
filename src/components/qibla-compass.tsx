import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getQiblaBearing } from "@/lib/prayer-times"
import { useHeading } from "@/hooks/use-heading"
import { useAppState } from "@/hooks/use-app-state"

const SIZE = 280
const CENTRE = SIZE / 2
const RADIUS = 124

/**
 * The Qibla compass.
 *
 * The bearing itself is exact and offline — great-circle initial bearing to the
 * Kaaba, from `adhan`. Only the *rotation* of the dial depends on the
 * magnetometer, so when there is no compass (desktop, denied permission) the
 * screen still answers the question, just as a number and a fixed needle.
 */
export function QiblaCompass() {
  const { location } = useAppState()
  const { heading, status, request } = useHeading()

  const qibla = getQiblaBearing(location)
  const live = heading !== null

  // With a live heading the dial counter-rotates so north stays physically
  // north; without one we simply point the needle at the bearing.
  const dialRotation = live ? -heading : 0
  const relative = live ? normalise(qibla - heading) : qibla
  const aligned = live && Math.min(relative, 360 - relative) < 5

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative grid place-items-center">
        <svg
          viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
          className="size-[18rem] max-w-full"
          role="img"
          aria-label={`Qibla is ${qibla.toFixed(0)} degrees from true north${
            live ? `, currently ${relative.toFixed(0)} degrees to your right` : ""
          }`}
        >
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            fill="var(--color-card)"
            stroke="var(--color-border)"
            strokeWidth={2}
          />

          <g
            style={{
              transform: `rotate(${String(dialRotation)}deg)`,
              transformOrigin: "center",
              transition: "transform 120ms linear",
            }}
          >
            <CardinalMarks />
            <QiblaNeedle bearing={qibla} aligned={aligned} />
          </g>

          {/* The device's own facing direction: fixed at the top, because the
              phone always points where the user is pointing it. */}
          <line
            x1={CENTRE}
            y1={CENTRE - RADIUS + 6}
            x2={CENTRE}
            y2={CENTRE - RADIUS + 22}
            stroke="var(--color-muted-foreground)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={CENTRE} cy={CENTRE} r={5} fill="var(--color-foreground)" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="tabular text-3xl font-semibold">{qibla.toFixed(1)}°</p>
        <p className="text-sm text-muted-foreground">
          from true north — {compassPoint(qibla)}
        </p>
        {aligned && (
          <output className="text-sm font-medium text-primary">
            Facing the Qibla
          </output>
        )}
      </div>

      {status === "prompt" && (
        <Button onClick={() => void request()}>
          <Compass aria-hidden />
          Enable compass
        </Button>
      )}

      {status === "denied" && (
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Compass access was denied, so the dial cannot rotate. The bearing above
          is still correct — line it up with a separate compass.
        </p>
      )}

      {status === "unsupported" && (
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          This device has no compass. Face {qibla.toFixed(0)}° from true north.
        </p>
      )}
    </div>
  )
}

function CardinalMarks() {
  const points = [
    { label: "N", angle: 0 },
    { label: "E", angle: 90 },
    { label: "S", angle: 180 },
    { label: "W", angle: 270 },
  ]

  return (
    <g>
      {Array.from({ length: 72 }, (_, index) => {
        const major = index % 6 === 0
        const outer = RADIUS - 8
        const inner = outer - (major ? 10 : 5)
        const start = pointAt(index * 5, inner)
        const end = pointAt(index * 5, outer)

        return (
          <line
            key={index}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="var(--color-muted-foreground)"
            strokeWidth={major ? 1.5 : 1}
            opacity={major ? 0.6 : 0.3}
          />
        )
      })}

      {points.map(({ label, angle }) => {
        const { x, y } = pointAt(angle, RADIUS - 34)
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            fontWeight={600}
            fill={
              label === "N"
                ? "var(--color-foreground)"
                : "var(--color-muted-foreground)"
            }
          >
            {label}
          </text>
        )
      })}
    </g>
  )
}

/**
 * A kite-shaped needle: a long point towards the Qibla and a short stub behind
 * the pivot. The asymmetry is the whole point — a symmetrical arrow leaves the
 * user guessing which end to face, which is the one mistake this screen cannot
 * afford.
 */
function QiblaNeedle({
  bearing,
  aligned,
}: {
  bearing: number
  aligned: boolean
}) {
  const tip = pointAt(bearing, RADIUS - 46)
  const left = pointAt(bearing + 90, 13)
  const right = pointAt(bearing - 90, 13)
  const tail = pointAt(bearing + 180, 30)
  const kaaba = pointAt(bearing, RADIUS - 22)

  return (
    <g>
      {/* Split into two halves so the pointing end is unmistakably the solid
          one; a single-colour diamond reads as symmetrical at a glance. */}
      <polygon
        points={toPoints([tip, left, right])}
        fill={aligned ? "var(--color-primary)" : "var(--color-foreground)"}
      />
      <polygon
        points={toPoints([left, tail, right])}
        fill="var(--color-muted-foreground)"
        opacity={0.45}
      />
      {/* The Kaaba itself, sitting on the rim at the bearing. */}
      <rect
        x={kaaba.x - 9}
        y={kaaba.y - 9}
        width={18}
        height={18}
        rx={3}
        fill="var(--color-primary)"
      />
      <rect
        x={kaaba.x - 9}
        y={kaaba.y - 2}
        width={18}
        height={3.5}
        fill="var(--color-primary-foreground)"
        opacity={0.9}
      />
    </g>
  )
}

/** Degrees clockwise from north → SVG coordinates, north at the top. */
function pointAt(degrees: number, radius: number) {
  const radians = ((degrees - 90) * Math.PI) / 180
  return {
    x: CENTRE + radius * Math.cos(radians),
    y: CENTRE + radius * Math.sin(radians),
  }
}

type Point = { x: number; y: number }

function toPoints(list: Point[]): string {
  return list.map((point) => `${String(point.x)},${String(point.y)}`).join(" ")
}

function normalise(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

const COMPASS_POINTS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const

function compassPoint(bearing: number): string {
  const index = Math.round(normalise(bearing) / 45) % 8
  return COMPASS_POINTS[index] ?? "north"
}
