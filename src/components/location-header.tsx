import { MapPin, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppState } from "@/hooks/use-app-state"

/**
 * The city name, doubling as the button that opens city search. Tapping the
 * pin asks for a GPS fix — it must stay a real user gesture, since iOS only
 * grants location from one.
 */
export function LocationHeader({ onSearch }: { onSearch: () => void }) {
  const { location, locationStatus, requestGeolocation } = useAppState()
  const locating = locationStatus === "locating"

  return (
    <header className="flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        onClick={onSearch}
        className="-ms-2 h-auto min-w-0 flex-1 justify-start px-2 py-1.5"
      >
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="truncate text-lg font-semibold">
            {location.city}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {location.source === "gps"
              ? "Current location"
              : location.source === "default"
                ? "Default location — tap to change"
                : "Tap to change"}
          </span>
        </span>
      </Button>

      <Button
        variant="secondary"
        size="icon"
        onClick={() => void requestGeolocation()}
        disabled={locating}
        aria-label="Use my current location"
      >
        {locating ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <MapPin aria-hidden />
        )}
      </Button>
    </header>
  )
}
