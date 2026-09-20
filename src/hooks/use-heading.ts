import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Device compass heading, in degrees clockwise from true north.
 *
 * This is the most browser-dependent code in the app:
 *
 * - **iOS Safari** exposes `webkitCompassHeading`, already true-north-referenced
 *   and already clockwise. It also requires `requestPermission()` to be called
 *   from inside a real user gesture — hence `request()` being separate from the
 *   effect rather than fired on mount.
 * - **Chrome / Android** fire `deviceorientationabsolute` with `alpha` measured
 *   counter-clockwise from north, so it has to be inverted.
 * - **Desktop** typically has no magnetometer at all, which is a supported
 *   outcome, not an error: the UI falls back to showing the bearing as a number.
 *
 * A secure context is mandatory (AGENTS.md §4.7); over plain HTTP these events
 * simply never fire.
 */

export type HeadingStatus =
  | "idle"
  | "unsupported"
  | "prompt"
  | "granted"
  | "denied"

interface WebkitDeviceOrientationEvent extends DeviceOrientationEvent {
  readonly webkitCompassHeading?: number
  readonly webkitCompassAccuracy?: number
}

/**
 * iOS exposes a static `DeviceOrientationEvent.requestPermission()` that no
 * other engine has and that the DOM lib does not declare. We probe for it at
 * runtime with `in` + `typeof` rather than asserting a type, so the check is
 * actually verified instead of merely promised to the compiler.
 */
function permissionRequester():
  | (() => Promise<PermissionState>)
  | null {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return null
  }

  const ctor: object = DeviceOrientationEvent
  if (!("requestPermission" in ctor)) return null

  const requestPermission = ctor.requestPermission
  if (typeof requestPermission !== "function") return null

  return async () => {
    const result: unknown = await requestPermission.call(ctor)
    return result === "granted" ? "granted" : "denied"
  }
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window
}

/**
 * Derived up-front rather than inside an effect, so the first paint already
 * shows the right affordance and React never has to render twice.
 */
function initialStatus(): HeadingStatus {
  if (!isSupported()) return "unsupported"
  // iOS: wait for the user to tap "Enable compass" — `requestPermission()`
  // only works from inside a real user gesture.
  return permissionRequester() ? "prompt" : "granted"
}

export interface HeadingState {
  /** Degrees clockwise from true north, or `null` if unknown. */
  heading: number | null
  status: HeadingStatus
  /** Call from a user gesture. Required on iOS. */
  request: () => Promise<void>
}

export function useHeading(): HeadingState {
  const [heading, setHeading] = useState<number | null>(null)
  const [status, setStatus] = useState<HeadingStatus>(initialStatus)
  const listening = useRef(false)

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const webkitHeading = (event as WebkitDeviceOrientationEvent)
      .webkitCompassHeading

    if (typeof webkitHeading === "number" && !Number.isNaN(webkitHeading)) {
      setHeading(normalise(webkitHeading))
      return
    }

    if (event.alpha !== null) {
      // `alpha` increases counter-clockwise, so the compass heading is its
      // complement. `absolute` events are north-referenced; relative ones are
      // not, but they are the best signal available on those devices.
      setHeading(normalise(360 - event.alpha))
    }
  }, [])

  const attach = useCallback(() => {
    if (listening.current) return
    listening.current = true

    // `deviceorientationabsolute` is preferred where it exists; Safari only has
    // the plain event, and adding both is harmless because Safari ignores the
    // absolute one.
    window.addEventListener("deviceorientationabsolute", handleOrientation)
    window.addEventListener("deviceorientation", handleOrientation)
  }, [handleOrientation])

  const request = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported")
      return
    }

    const requestPermission = permissionRequester()
    if (!requestPermission) {
      attach()
      setStatus("granted")
      return
    }

    try {
      const result = await requestPermission()
      if (result === "granted") {
        attach()
        setStatus("granted")
      } else {
        setStatus("denied")
      }
    } catch {
      // Safari throws when this is called outside a user gesture.
      setStatus("denied")
    }
  }, [attach])

  useEffect(() => {
    // Where no permission prompt is required we can start listening straight
    // away; on iOS `request()` does it after the user opts in.
    if (isSupported() && !permissionRequester()) attach()

    return () => {
      listening.current = false
      window.removeEventListener("deviceorientationabsolute", handleOrientation)
      window.removeEventListener("deviceorientation", handleOrientation)
    }
  }, [attach, handleOrientation])

  return { heading, status, request }
}

function normalise(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}
