import { createContext } from "react"
import type { AppLocation, Settings } from "@/lib/schemas"
import type { GeolocationFailure } from "@/lib/geo"

export type LocationStatus = "idle" | "locating" | "ready" | "error"

export interface AppState {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void

  location: AppLocation
  setLocation: (location: AppLocation) => void
  locationStatus: LocationStatus
  locationError: GeolocationFailure | null
  /** Requests a GPS fix. Must be called from a user gesture on iOS. */
  requestGeolocation: () => Promise<void>
}

export const AppStateContext = createContext<AppState | null>(null)
