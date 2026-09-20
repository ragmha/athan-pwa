import type {
  AppLocation,
  CalculationMethodKey,
  HighLatitudeRuleKey,
  Settings,
} from "@/lib/schemas"

/**
 * Prayer times are only as correct as the calculation method, and the right
 * method is a regional/juristic choice rather than a technical one. When the
 * user has not picked explicitly we infer from the detected country, which
 * matches what local mosques in that country generally publish.
 */
const COUNTRY_METHODS: Record<string, CalculationMethodKey> = {
  // Gulf
  SA: "UmmAlQura",
  AE: "Dubai",
  QA: "Qatar",
  KW: "Kuwait",
  BH: "Kuwait",
  OM: "Kuwait",
  YE: "UmmAlQura",

  // Egypt and much of Africa follow the Egyptian General Authority
  EG: "Egyptian",
  SD: "Egyptian",
  LY: "Egyptian",
  DZ: "Egyptian",
  MA: "Egyptian",
  TN: "Egyptian",
  NG: "Egyptian",
  KE: "Egyptian",
  SO: "Egyptian",

  // South and Central Asia
  PK: "Karachi",
  IN: "Karachi",
  BD: "Karachi",
  AF: "Karachi",
  LK: "Karachi",

  TR: "Turkey",
  IR: "Tehran",

  // South-East Asia
  SG: "Singapore",
  MY: "Singapore",
  ID: "Singapore",
  BN: "Singapore",

  // North America
  US: "NorthAmerica",
  CA: "NorthAmerica",
}

/**
 * Muslim World League is the common default across Europe — including Finland —
 * and is the safest fallback anywhere unmapped.
 */
export const FALLBACK_METHOD: CalculationMethodKey = "MuslimWorldLeague"

export function methodForCountry(
  countryCode: string | null
): CalculationMethodKey {
  if (countryCode === null) return FALLBACK_METHOD
  return COUNTRY_METHODS[countryCode.toUpperCase()] ?? FALLBACK_METHOD
}

/** An explicit user choice always wins over the country inference. */
export function resolveCalculationMethod(
  settings: Settings,
  location: AppLocation
): CalculationMethodKey {
  return settings.calculationMethod ?? methodForCountry(location.countryCode)
}

export const METHOD_LABELS: Record<CalculationMethodKey, string> = {
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority",
  Karachi: "University of Islamic Sciences, Karachi",
  UmmAlQura: "Umm al-Qura, Makkah",
  Dubai: "Dubai",
  MoonsightingCommittee: "Moonsighting Committee",
  NorthAmerica: "ISNA (North America)",
  Kuwait: "Kuwait",
  Qatar: "Qatar",
  Singapore: "Singapore",
  Tehran: "Institute of Geophysics, Tehran",
  Turkey: "Diyanet İşleri (Turkey)",
}

export const HIGH_LATITUDE_RULE_LABELS: Record<HighLatitudeRuleKey, string> = {
  auto: "Recommended for your latitude",
  middleofthenight: "Middle of the night",
  seventhofthenight: "One seventh of the night",
  twilightangle: "Twilight angle",
}
