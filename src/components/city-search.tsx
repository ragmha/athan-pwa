import { useEffect, useState } from "react"
import { LoaderCircle, MapPin, Search } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cityResultToLocation, searchCities, type CityResult } from "@/lib/geo"
import { useAppState } from "@/hooks/use-app-state"

/**
 * City search over Open-Meteo's keyless geocoder.
 *
 * Network access here is strictly optional (AGENTS.md §4.4) — failing to find a
 * city never affects the times already on screen, so the offline path is a
 * quiet empty state rather than an error.
 */
export function CitySearch({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { setLocation } = useAppState()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const trimmed = query.trim()
  const tooShort = trimmed.length < 2

  useEffect(() => {
    const controller = new AbortController()

    // Debounced so typing "Helsinki" is one request, not eight. The state
    // updates all happen in the timer or the response, never synchronously
    // during the effect, so this never cascades a render.
    const timer = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults([])
        setLoading(false)
        setFailed(false)
        return
      }

      setLoading(true)
      setFailed(false)

      void (async () => {
        try {
          const found = await searchCities(trimmed, controller.signal)
          if (!controller.signal.aborted) setResults(found)
        } catch {
          if (!controller.signal.aborted) setFailed(true)
        } finally {
          if (!controller.signal.aborted) setLoading(false)
        }
      })()
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  const choose = (result: CityResult) => {
    setLocation(cityResultToLocation(result))
    onOpenChange(false)
    setQuery("")
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change location"
      description="Search for a city to use for prayer times"
      // The list is already ordered by the geocoder's relevance ranking;
      // re-filtering locally would hide correct results.
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Search for a city…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && !tooShort && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Searching…
          </div>
        )}

        {(!loading || tooShort) && results.length === 0 && (
          <CommandEmpty>
            {failed
              ? "Search is unavailable offline. Prayer times still work."
              : tooShort
                ? "Type at least two letters."
                : "No cities found."}
          </CommandEmpty>
        )}

        {results.length > 0 && !tooShort && (
          <CommandGroup heading="Cities">
            {results.map((result) => (
              <CommandItem
                key={result.id}
                value={String(result.id)}
                onSelect={() => {
                  choose(result)
                }}
              >
                <MapPin className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{result.city}</span>
                <span className="truncate text-muted-foreground">
                  {[result.region, result.country]
                    .filter((part) => part !== null)
                    .join(", ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

export function CitySearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
    >
      <Search className="size-4" aria-hidden />
      Search for a city
    </button>
  )
}
