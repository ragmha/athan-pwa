import { z } from "zod"

/**
 * Every value that enters the app from outside its own code is parsed here.
 *
 * There are exactly three such boundaries: `localStorage`, the Open-Meteo
 * geocoding API and the BigDataCloud reverse-geocoding API. None of them are
 * trustworthy — stored data may come from an older schema version or have been
 * hand-edited, and third-party JSON can change shape without warning.
 *
 * See AGENTS.md §4.3.
 */

/** Bumped whenever a persisted shape changes incompatibly. */
export const STORAGE_VERSION = 1

// ---------------------------------------------------------------------------
// Domain enums
// ---------------------------------------------------------------------------

/** Keys of `adhan`'s `CalculationMethod`, so they map 1:1 with no translation. */
export const calculationMethodSchema = z.enum([
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "UmmAlQura",
  "Dubai",
  "MoonsightingCommittee",
  "NorthAmerica",
  "Kuwait",
  "Qatar",
  "Singapore",
  "Tehran",
  "Turkey",
])
export type CalculationMethodKey = z.infer<typeof calculationMethodSchema>

export const madhabSchema = z.enum(["shafi", "hanafi"])
export type MadhabKey = z.infer<typeof madhabSchema>

/**
 * `auto` defers to `HighLatitudeRule.recommended()`, which picks a rule based on
 * latitude. The explicit values let a user who follows a particular ruling pin it.
 */
export const highLatitudeRuleSchema = z.enum([
  "auto",
  "middleofthenight",
  "seventhofthenight",
  "twilightangle",
])
export type HighLatitudeRuleKey = z.infer<typeof highLatitudeRuleSchema>

export const clockFormatSchema = z.enum(["12h", "24h"])
export type ClockFormat = z.infer<typeof clockFormatSchema>

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().min(1),
  countryCode: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase())
    .nullable(),
  /** How we obtained this fix, so the UI can be honest about its provenance. */
  source: z.enum(["gps", "manual", "default"]),
})
export type AppLocation = z.infer<typeof locationSchema>

/** Used before permission is granted, and whenever location is unavailable. */
export const DEFAULT_LOCATION: AppLocation = {
  latitude: 60.1699,
  longitude: 24.9384,
  city: "Helsinki",
  countryCode: "FI",
  source: "default",
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settingsSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  /** `null` means "follow the detected country" (see `method-map.ts`). */
  calculationMethod: calculationMethodSchema.nullable(),
  madhab: madhabSchema,
  highLatitudeRule: highLatitudeRuleSchema,
  clockFormat: clockFormatSchema,
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  version: STORAGE_VERSION,
  calculationMethod: null,
  madhab: "hanafi",
  highLatitudeRule: "auto",
  clockFormat: "24h",
}

// ---------------------------------------------------------------------------
// Third-party API responses
// ---------------------------------------------------------------------------

/** https://geocoding-api.open-meteo.com/v1/search */
export const openMeteoGeocodingSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
      })
    )
    .optional(),
})

/** https://api.bigdatacloud.net/data/reverse-geocode-client */
export const bigDataCloudReverseSchema = z.object({
  city: z.string().optional(),
  locality: z.string().optional(),
  principalSubdivision: z.string().optional(),
  countryCode: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Reads and validates a persisted value, falling back to `fallback` whenever the
 * key is absent, unparseable, or no longer matches the schema. Storage access is
 * wrapped because Safari throws on `localStorage` in some privacy modes rather
 * than returning null.
 */
export function readPersisted<S extends z.ZodType>(
  key: string,
  schema: S,
  fallback: z.infer<S>
): z.infer<S> {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return fallback
  }

  if (raw === null) return fallback

  try {
    const parsed: unknown = JSON.parse(raw)
    const result = schema.safeParse(parsed)
    return result.success ? result.data : fallback
  } catch {
    return fallback
  }
}

/** Best-effort write. Storage failures must never break the UI. */
export function writePersisted(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled — the app still works in-memory.
  }
}

export const STORAGE_KEYS = {
  settings: "athan.settings",
  location: "athan.location",
} as const
