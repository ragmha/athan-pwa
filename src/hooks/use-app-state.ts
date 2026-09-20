import { use } from "react"
import { AppStateContext, type AppState } from "@/lib/app-state-context"

export function useAppState(): AppState {
  const state = use(AppStateContext)
  if (!state) {
    throw new Error("useAppState must be used within <AppStateProvider>")
  }
  return state
}
