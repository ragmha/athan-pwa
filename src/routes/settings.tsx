import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useTheme } from "@/components/theme-provider"
import { useAppState } from "@/hooks/use-app-state"
import {
  HIGH_LATITUDE_RULE_LABELS,
  METHOD_LABELS,
  resolveCalculationMethod,
} from "@/lib/method-map"
import {
  calculationMethodSchema,
  highLatitudeRuleSchema,
  type CalculationMethodKey,
  type HighLatitudeRuleKey,
} from "@/lib/schemas"

const AUTO = "auto"

/**
 * Base UI's `Select.Value` renders the raw value unless the root is given an
 * `items` map, so every select below declares one. Deriving them from the same
 * label records the rest of the app uses keeps the two from drifting apart.
 */
const METHOD_ITEMS: Record<string, string> = {
  [AUTO]: "Automatic",
  ...METHOD_LABELS,
}

const THEME_ITEMS: Record<string, string> = {
  system: "Match the system",
  light: "Light",
  dark: "Dark",
}

export function SettingsRoute() {
  const { settings, updateSettings, resetSettings, location } = useAppState()
  const { theme, setTheme } = useTheme()

  const inferred = resolveCalculationMethod(
    { ...settings, calculationMethod: null },
    location
  )

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-8">
      <h1 className="text-lg font-semibold">Settings</h1>

      <Field
        label="Calculation method"
        hint={
          settings.calculationMethod === null
            ? `Following your location — currently ${METHOD_LABELS[inferred]}.`
            : "Methods differ in the sun-depression angles used for Fajr and Isha."
        }
      >
        <Select
          items={METHOD_ITEMS}
          value={settings.calculationMethod ?? AUTO}
          onValueChange={(value) => {
            updateSettings({
              calculationMethod:
                value === AUTO ? null : calculationMethodSchema.parse(value),
            })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(METHOD_ITEMS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Asr calculation"
        hint="Hanafi times Asr when a shadow is twice an object's length; the other schools use once."
      >
        <ToggleRow
          id="madhab"
          label="Use the Hanafi method"
          checked={settings.madhab === "hanafi"}
          onCheckedChange={(checked) => {
            updateSettings({ madhab: checked ? "hanafi" : "shafi" })
          }}
        />
      </Field>

      <Separator />

      <Field
        label="High latitude rule"
        hint={`At ${Math.abs(location.latitude).toFixed(1)}° there are nights when true twilight never arrives. This decides what to show instead.`}
      >
        <Select
          items={HIGH_LATITUDE_RULE_LABELS}
          value={settings.highLatitudeRule}
          onValueChange={(value) => {
            updateSettings({
              highLatitudeRule: highLatitudeRuleSchema.parse(value),
            })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(HIGH_LATITUDE_RULE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Separator />

      <Field label="Clock">
        <ToggleRow
          id="clock"
          label="Use a 24-hour clock"
          checked={settings.clockFormat === "24h"}
          onCheckedChange={(checked) => {
            updateSettings({ clockFormat: checked ? "24h" : "12h" })
          }}
        />
      </Field>

      <Field label="Appearance">
        <Select
          items={THEME_ITEMS}
          value={theme}
          onValueChange={(value) => {
            if (value === "light" || value === "dark" || value === "system") {
              setTheme(value)
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(THEME_ITEMS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Prayer list"
        hint="Additional times are not included in prayer tracking or streaks."
      >
        <Label
          htmlFor="show-additional-times"
          className="min-h-11 justify-between gap-4"
        >
          <span>Show Qiyam and Sunrise</span>
          <span className="grid size-11 shrink-0 place-items-center">
            <Checkbox
              id="show-additional-times"
              checked={settings.showAdditionalTimes}
              onCheckedChange={(checked) => {
                updateSettings({ showAdditionalTimes: checked })
              }}
            />
          </span>
        </Label>
      </Field>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={resetSettings}>
          Reset to defaults
        </Button>
        <p className="text-xs text-muted-foreground">
          Prayer times are calculated on this device and work without a network
          connection. Nothing is sent anywhere.
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{label}</h2>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </section>
  )
}

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export type { CalculationMethodKey, HighLatitudeRuleKey }
