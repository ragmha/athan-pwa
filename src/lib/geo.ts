import {
  bigDataCloudReverseSchema,
  openMeteoGeocodingSchema,
  type AppLocation,
} from "@/lib/schemas"

/**
 * Geocoding. Both services are keyless and both are strictly *optional*: they
 * only ever supply a human-readable city label or let the user search for a
 * city. Prayer times never depend on them (AGENTS.md §4.4), so every failure
 * path here degrades to coordinates rather than an error screen.
 */

const SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search"
const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client"

const REQUEST_TIMEOUT_MS = 8000

export interface CityResult {
  id: number
  city: string
  region: string | null
  country: string | null
  countryCode: string | null
  latitude: number
  longitude: number
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  // Compose the caller's signal with our own timeout so a hung request can
  // never leave a spinner running forever on a flaky mobile connection.
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${String(response.status)}`)
  }

  return response.json()
}

/** Searches cities by name. Returns `[]` rather than throwing on bad input. */
export async function searchCities(
  query: string,
  signal?: AbortSignal
): Promise<CityResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = `${SEARCH_URL}?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`
  const parsed = openMeteoGeocodingSchema.safeParse(await fetchJson(url, signal))

  if (!parsed.success) return []

  return (parsed.data.results ?? []).map((result) => ({
    id: result.id,
    city: result.name,
    region: result.admin1 ?? null,
    country: result.country ?? null,
    countryCode: result.country_code?.toUpperCase() ?? null,
    latitude: result.latitude,
    longitude: result.longitude,
  }))
}

export function cityResultToLocation(result: CityResult): AppLocation {
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    city: result.city,
    countryCode: result.countryCode,
    source: "manual",
  }
}

/**
 * Turns a GPS fix into a named place. If the lookup fails — offline, blocked,
 * rate-limited — we still return a usable location, labelled with its
 * coordinates, because the prayer times are already correct without a name.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<AppLocation> {
  const fallback: AppLocation = {
    latitude,
    longitude,
    city: formatCoordinates(latitude, longitude),
    countryCode: null,
    source: "gps",
  }

  try {
    const url = `${REVERSE_URL}?latitude=${String(latitude)}&longitude=${String(longitude)}&localityLanguage=en`
    const parsed = bigDataCloudReverseSchema.safeParse(
      await fetchJson(url, signal)
    )

    if (!parsed.success) return fallback

    const { city, locality, principalSubdivision, countryCode } = parsed.data
    const name = [city, locality, principalSubdivision].find(
      (value) => value !== undefined && value.length > 0
    )

    return {
      ...fallback,
      city: name ?? fallback.city,
      countryCode: countryCode ? countryCode.toUpperCase() : null,
    }
  } catch {
    return fallback
  }
}

/** e.g. `60.17°N, 24.94°E` — a dignified stand-in for an unknown city name. */
export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? "N" : "S"}`
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "E" : "W"}`
  return `${lat}, ${lon}`
}

export type GeolocationFailure =
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"

export class GeolocationFailureError extends Error {
  constructor(readonly kind: GeolocationFailure) {
    super(kind)
    this.name = "GeolocationFailureError"
  }
}

/** Promise wrapper over the callback-based Geolocation API. */
export async function getCurrentPosition(): Promise<GeolocationCoordinates> {
  if (!("geolocation" in navigator)) {
    throw new GeolocationFailureError("unsupported")
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords)
      },
      (error) => {
        const kind: GeolocationFailure =
          error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable"
        reject(new GeolocationFailureError(kind))
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 }
    )
  })
}
