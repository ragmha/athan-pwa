import { NavLink } from "react-router"
import { Clock, Compass, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/", label: "Prayers", icon: Clock, end: true },
  { to: "/qibla", label: "Qibla", icon: Compass, end: false },
  { to: "/settings", label: "Settings", icon: Settings2, end: false },
] as const

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 border-t border-border bg-background/90 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
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
