import { lazy, Suspense } from "react"
import { Route, Routes, useLocation } from "react-router"
import { BottomNav } from "@/components/bottom-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { PrayersRoute } from "@/routes/prayers"

// Prayers is the landing screen and stays in the main bundle. The other two
// are a tab away, so their cost — and Base UI's form primitives with them —
// is deferred until they are actually opened.
const QiblaRoute = lazy(async () => ({
  default: (await import("@/routes/qibla")).QiblaRoute,
}))
const SettingsRoute = lazy(async () => ({
  default: (await import("@/routes/settings")).SettingsRoute,
}))

export function App() {
  const { pathname } = useLocation()

  return (
    <div className="flex app-frame flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <main
        key={pathname}
        id="main"
        className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto"
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<PrayersRoute />} />
            <Route path="/qibla" element={<QiblaRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="*" element={<PrayersRoute />} />
          </Routes>
        </Suspense>
      </main>

      <BottomNav />
    </div>
  )
}

function RouteFallback() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export default App
