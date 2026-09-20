import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import {
  AppStateContext,
  type AppState,
  type LocationStatus,
} from "@/lib/app-state-context"
import {
  GeolocationFailureError,
  getCurrentPosition,
  reverseGeocode,
  type GeolocationFailure,
} from "@/lib/geo"
import {
  DEFAULT_LOCATION,
  DEFAULT_SETTINGS,
  locationSchema,
  readPersisted,
  settingsSchema,
  STORAGE_KEYS,
  writePersisted,
  type AppLocation,
  type Settings,
} from "@/lib/schemas"

/**
 * Owns the two pieces of durable state: the user's settings and their location.
 *
 * Both are read through zod on first render (AGENTS.md §4.3) so a stale or
 * hand-edited `localStorage` entry degrades to defaults instead of crashing the
 * app on launch.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    readPersisted(STORAGE_KEYS.settings, settingsSchema, DEFAULT_SETTINGS)
  )
  const [location, setLocationState] = useState<AppLocation>(() =>
    readPersisted(STORAGE_KEYS.location, locationSchema, DEFAULT_LOCATION)
  )
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() =>
    // A persisted fix is already usable, so we don't show a loading state for
    // a returning user.
    readPersisted(STORAGE_KEYS.location, locationSchema, DEFAULT_LOCATION)
      .source === "default"
      ? "idle"
      : "ready"
  )
  const [locationError, setLocationError] = useState<GeolocationFailure | null>(
    null
  )

  // Guards against a second lookup while one is in flight — tapping the
  // location button twice should not fire two GPS requests.
  const inFlight = useRef(false)

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch }
      writePersisted(STORAGE_KEYS.settings, next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    writePersisted(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const setLocation = useCallback((next: AppLocation) => {
    writePersisted(STORAGE_KEYS.location, next)
    setLocationState(next)
    setLocationStatus("ready")
    setLocationError(null)
  }, [])

  const requestGeolocation = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true

    setLocationStatus("locating")
    setLocationError(null)

    try {
      const coords = await getCurrentPosition()
      const resolved = await reverseGeocode(coords.latitude, coords.longitude)
      setLocation(resolved)
    } catch (error) {
      setLocationError(
        error instanceof GeolocationFailureError ? error.kind : "unavailable"
      )
      // Deliberately keep whatever location we already had: a denied permission
      // should leave Helsinki (or the user's last city) on screen, not a blank.
      setLocationStatus("error")
    } finally {
      inFlight.current = false
    }
  }, [setLocation])

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      location,
      setLocation,
      locationStatus,
      locationError,
      requestGeolocation,
    }),
    [
      settings,
      updateSettings,
      resetSettings,
      location,
      setLocation,
      locationStatus,
      locationError,
      requestGeolocation,
    ]
  )

  return <AppStateContext value={value}>{children}</AppStateContext>
}
