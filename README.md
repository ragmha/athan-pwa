# Athan

An offline-first, installable prayer-times app. It shows the five daily prayers
plus Shuruq, a live countdown to the next one, the Gregorian and Hijri date, and
the direction of the Qibla. You can also check off each completed prayer and
track the day's progress.

Everything is computed **on the device**. There is no backend, no account and no
analytics, and the app is fully usable in airplane mode.

Prayer completion is stored locally per calendar day. It never leaves the device
and automatically starts a fresh checklist on the next day.

## Why it is built this way

Most prayer apps call a web API. This one does not, for two reasons:

1. An installable app that stops working underground is not much of an app.
   Prayer times are pure astronomy, so there is no reason to ask a server.
2. Nothing about your location ever leaves the device.

Times come from [`adhan`](https://github.com/batoulapps/adhan-js), the reference
implementation of the standard Meeus-based algorithms.

## The high-latitude problem

The default location is **Helsinki, at 60.17 °N**, and that shaped the whole
project. From late May to mid-July the sun there never sinks 18° below the
horizon, so the twilight that defines Fajr and Isha *never happens*. A naive
calculation quietly returns nonsense.

Most apps paper over this by applying a night-portion rule and presenting the
result as fact. This one does not. `src/lib/solar.ts` works out the sun's
altitude at lower culmination independently of `adhan`, which lets every time be
classified honestly:

| Basis | Meaning |
| --- | --- |
| `observed` | Real twilight at the method's angle |
| `ruleAdjusted` | Twilight happens, but the high-latitude rule moved the time |
| `undefined` | The required twilight never occurs — the time is a construct |

Anything that is not `observed` is labelled in the list, and the note beneath
explains which rule produced it. You can change the rule in Settings.

## Getting started

Requires [bun](https://bun.sh) 1.3+.

```bash
bun install
bun dev
```

| Task | Command |
| --- | --- |
| Dev server | `bun dev` |
| Type check | `bun run typecheck` |
| Lint | `bun run lint` |
| Tests | `bun run test` |
| All three | `bun run check` |
| Production build | `bun run build` |
| Preview the build | `bun run preview` |

### Testing on a phone

Geolocation, the compass and service workers all require a secure context.
`http://192.168.x.x:5173` **silently** disables them — if location "does not
work" on your phone, that is why. Use an HTTPS tunnel.

## Stack

React 19 · TypeScript 7 · Vite 8 · Tailwind 4 · shadcn/ui (Base UI) · adhan ·
zod · vite-plugin-pwa · vitest · oxlint.

TypeScript 7 ships without a stable compiler API, so `typescript-eslint` cannot
run. Linting is [oxlint](https://oxc.rs) with `--type-aware`, which keeps
type-aware rules via the same Go type-checker. See `AGENTS.md` §4.1.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages. The subpath is set by
`BASE` in `vite.config.ts` and must stay in sync with the router, the manifest
and the service-worker scope — see `AGENTS.md` §4.6.

## Not included

**Timed adhan notifications.** iOS web push cannot reliably fire a scheduled
sound while an installed PWA is closed, so rather than ship a reminder that
works only sometimes, there is none.

## Accuracy

Calculated prayer times are an aid, not an authority. Where they differ from
your local mosque, follow your local mosque. The Hijri date uses the calculated
Umm al-Qura calendar, which can differ by a day from local moon sighting.

## Contributing

Read [`AGENTS.md`](./AGENTS.md) first — it documents the constraints that keep
the calculations correct. `bun run check` must pass.
