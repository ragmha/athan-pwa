import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AppStateProvider } from "@/components/app-state-provider.tsx"

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      {/* `basename` comes from Vite's `base`, so the GitHub Pages subpath is
          configured in exactly one place (AGENTS.md §4.6). */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
