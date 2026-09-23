import { NavLink } from "react-router"
import { MoonStar, Compass, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/", label: "Prayers", icon: MoonStar, end: true },
  { to: "/qibla", label: "Qibla", icon: Compass, end: false },
  { to: "/settings", label: "Settings", icon: Settings2, end: false },
] as const

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-border bg-background"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
                  isActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
