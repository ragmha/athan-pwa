import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, settingsSchema } from "@/lib/schemas"

describe("settings compatibility", () => {
  it("hides optional times by default", () => {
    expect(DEFAULT_SETTINGS.showAdditionalTimes).toBe(false)
  })

  it("retains old preferences while defaulting the new checkbox to off", () => {
    const result = settingsSchema.safeParse({
      version: 1,
      calculationMethod: "Karachi",
      madhab: "hanafi",
      highLatitudeRule: "seventhofthenight",
      clockFormat: "12h",
    })
    expect(result.success && result.data).toEqual({
      version: 1,
      calculationMethod: "Karachi",
      madhab: "hanafi",
      highLatitudeRule: "seventhofthenight",
      clockFormat: "12h",
      showAdditionalTimes: false,
    })
  })

  it("validates the checkbox value instead of coercing corrupt settings", () => {
    expect(
      settingsSchema.safeParse({
        ...DEFAULT_SETTINGS,
        showAdditionalTimes: "yes",
      }).success
    ).toBe(false)
  })
})
