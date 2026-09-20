import { QiblaCompass } from "@/components/qibla-compass"
import { useAppState } from "@/hooks/use-app-state"

export function QiblaRoute() {
  const { location } = useAppState()

  return (
    <div className="flex flex-col items-center gap-6 px-5 pt-6 pb-8">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-lg font-semibold">Qibla</h1>
        <p className="text-sm text-muted-foreground">
          Direction to the Kaaba from {location.city}
        </p>
      </div>

      <QiblaCompass />

      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Hold the phone flat. Metal and magnets nearby will pull the reading;
        move away from them and rotate the phone in a figure of eight to
        recalibrate.
      </p>
    </div>
  )
}
