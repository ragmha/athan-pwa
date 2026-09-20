# AGENTS.md

Guidance for AI agents and humans working in this repository. Read this before
changing anything. Rules marked **MUST** / **NEVER** are not stylistic — breaking
them produces incorrect prayer times, a broken install, or a failing build.

---

## 1. What this is

**Athan** is an offline-first, installable PWA that shows Qiyam, the five daily
prayers, and Sunrise for the user's location, a live countdown to the next
prayer, the Gregorian and Hijri date, and the Qibla direction.

It is a **single-page, client-only app**. There is no backend, no database and no
user account. All state lives in `localStorage`.

### Non-goals

- **No timed adhan notifications.** iOS web push cannot reliably fire a scheduled
  sound while an installed PWA is closed. We do not ship a half-working reminder.
  A separate native iOS app (`../athan`) covers that.
- **No server, SSR or API routes.** The app is deployed as static files.
- **No account system, sync or analytics.**

---

## 2. Commands

| Task | Command |
| --- | --- |
| Dev server | `bun dev` |
| Type check | `bun run typecheck` |
| Lint (type-aware) | `bun run lint` |
| Unit tests | `bun run test` |
| Everything | `bun run check` |
| Production build | `bun run build` |
| Preview the build | `bun run preview` |

`bun run check` is the gate. Run it before declaring any task done.

Prefer running these through `run_silent` (from the `stay-sharp` skill) so passing
output collapses to a single line and only failures are printed in full.

---

## 3. Stack

Every version below was chosen deliberately. Do not upgrade or swap one without
reading the reasoning.

| Package | Version | Why |
| --- | --- | --- |
| `typescript` | **7.0.2** | Latest. Go-native compiler |
| `oxlint` + `oxlint-tsgolint` | 1.83 / 7.0.2002 | Linting — see §4.1 |
| `vite` | 8.3 | Build tool; transpiles TS with oxc |
| `react` / `react-dom` | 19.3 | — |
| `tailwindcss` / `@tailwindcss/vite` | 4.3 | CSS-first config, no JS config file |
| `shadcn` (CLI) | 4.21 | Components, **Base UI** primitives, `nova` preset, RTL on |
| `react-router` | 8.4 | Client-side routing |
| `adhan` | 4.4 | Prayer-time + Qibla maths — see §4.4 |
| `zod` | 4.6 | Boundary validation — see §4.3 |
| `vite-plugin-pwa` | 1.3 | Manifest + Workbox service worker |
| `vitest` | 5.0 | Unit tests |

Runtime: **bun 1.3+**. Use `bun` / `bunx`, never `npm` or `pnpm`, so the lockfile
stays consistent.

---

## 4. Hard constraints

### 4.1 NEVER add `eslint` or `typescript-eslint`

This project runs **TypeScript 7**, which ships without a stable public compiler
API. `typescript-eslint@8` declares:

```
peerDependencies.typescript: ">=4.8.4 <6.1.0"
```

It therefore **cannot** run here. ESLint was deliberately removed from the shadcn
scaffold.

Linting is **oxlint** with `--type-aware`, backed by `oxlint-tsgolint` (the same
Go type-checker as TS 7), configured in `.oxlintrc.json`. This gives full
type-aware rules — `no-floating-promises`, `no-misused-promises`,
`no-unnecessary-condition`, `no-unsafe-type-assertion` — so nothing is lost.

If you hit a genuine oxlint limitation, raise it rather than reintroducing ESLint.

### 4.2 NEVER hand-write files in `src/components/ui/`

That directory is owned by the shadcn CLI. To get a component:

```bash
bunx --bun shadcn@latest add <component>
```

Search the registry before building custom UI:
`bunx --bun shadcn@latest search <query>`. `src/components/ui/` is excluded from
linting because it is generated.

This project uses **Base UI**, not Radix. Consequences:

- Use the `render` prop for custom triggers, **not** `asChild`.
- Toasts come from the `toast` component, **not** `sonner`.

### 4.3 ALL external data MUST be parsed with zod

There are exactly three untrusted boundaries:

1. `localStorage` — may hold stale, hand-edited or corrupt data from an older
   schema version.
2. The Open-Meteo geocoding response.
3. The BigDataCloud reverse-geocoding response.

Every one of them goes through `safeParse` in `src/lib/schemas.ts`, with a
fallback to defaults on failure. Persisted schemas carry a **version** field.

- **NEVER** use `as` to assert the shape of external data.
- Derive types with `z.infer` so the schema is the single source of truth; never
  hand-maintain a parallel `interface`.
- `no-unsafe-type-assertion` is an error in the lint config to enforce this.

### 4.4 NEVER fetch prayer times from a network API

Prayer times and the Qibla bearing are computed **locally** with `adhan`, and the
Hijri date with `Intl.DateTimeFormat` (`islamic-umalqura`). The app must be fully
usable in airplane mode.

The network is permitted for exactly two optional things: city *search* and
reverse-geocoding the city *label*. Both must degrade gracefully offline.

### 4.5 NEVER display a high-latitude time without its marker

The default location is **Helsinki (60.17 °N)**. Between late May and mid-July the
sun never dips far enough below the horizon for true Fajr or Isha to occur. A
naive calculation yields nonsense or `Invalid Date`.

Therefore:

- Always pass a `HighLatitudeRule` (default `HighLatitudeRule.recommended(coords)`)
  and a `PolarCircleResolution` to `adhan`.
- When a time is derived from such a rule rather than from true twilight, the UI
  **MUST** mark it and be able to explain which rule produced it. We never present
  an approximation as though it were observed fact.
- Any change to `src/lib/prayer-times.ts` **MUST** keep the Helsinki solstice tests
  green.

### 4.6 The base path MUST stay in sync

The app is served from a GitHub Pages subpath. `BASE` in `vite.config.ts` is the
single source of truth. If it changes, all of these must change with it:

- Vite `base`
- the router `basename`
- the manifest `start_url`, `scope` and `id`
- the Workbox `navigateFallback`
- the deploy workflow

A mismatch silently breaks installation to the home screen.

### 4.7 HTTPS is required for the real features

Geolocation, `DeviceOrientationEvent` and service workers all require a secure
context. `http://192.168.x.x:5173` **silently** disables GPS and the compass — if
you are testing on a phone and location "does not work", check this first. Use an
HTTPS tunnel.

---

## 5. Testing policy

- The prayer-time layer is **pure** (coordinates + date + settings → times). It is
  the highest-value thing to test and **MUST** have unit tests.
- Mandatory fixtures: **Helsinki at the summer solstice, the winter solstice and
  an equinox**, plus one mid-latitude control city.
- Time-dependent code takes an injected `now: Date`. **NEVER** call `Date.now()`
  or `new Date()` directly inside logic you want to test.
- Bug fixes start with a failing test.

---

## 6. Conventions

### Layout

```
src/
├── routes/      # one file per screen: prayers, qibla, settings
├── components/
│   ├── ui/      # shadcn-generated — do not hand-edit
│   └── *.tsx    # app components, kebab-case filenames
├── lib/         # pure logic: prayer-times, qibla, hijri, geo, schemas, format
├── hooks/       # use-*.ts
└── test/        # setup + shared fixtures
```

Pure logic belongs in `lib/`, never inside a component. If it can be unit-tested
without React, it goes in `lib/`.

### Styling

- Tailwind **v4**: configuration is CSS-first in `src/index.css` via `@theme`.
  There is no `tailwind.config.js` — do not create one.
- Custom utilities use `@utility`, not `@layer utilities`.
- Use **semantic tokens** (`bg-background`, `text-muted-foreground`,
  `bg-primary`). **NEVER** raw colours like `bg-blue-500`, and never manual
  `dark:` colour overrides — dark mode is handled by tokens.
- `className` is for layout, not for restyling a component's colours or type.
- **NEVER** `space-x-*` / `space-y-*`; use `flex` + `gap-*`.
- Use `size-*` when width and height match; use `cn()` for conditional classes.

### Theming

`src/components/theme-provider.tsx` (from the shadcn scaffold) owns light / dark /
system. Do **not** add `next-themes`; it would duplicate this.

### Accessibility and i18n

- Prayer names are shown in Arabic alongside the transliteration, and the project
  is RTL-enabled (`components.json` → `"rtl": true`). Do not hard-code `left` /
  `right`; use logical properties (`ms-*`, `me-*`, `start` / `end`).
- The Qibla compass and the day dial are graphical: both **MUST** expose an
  accessible text equivalent (the bearing in degrees, the times as text).
- Honour `prefers-reduced-motion` for the dial and any animation.
- Respect safe-area insets so the installed app clears the notch and home bar.

### Comments

Comment *why*, not *what*. The astronomical and high-latitude code is the one
place where generous explanation is encouraged.

---

## 7. Skills

Installed globally via [skills.sh](https://skills.sh). Reach for these rather than
guessing:

| Situation | Skill |
| --- | --- |
| Adding or composing shadcn components | `shadcn` |
| React 19 patterns, hooks, performance | `vercel-react-best-practices` |
| Visual polish, spacing, hierarchy | `web-design-guidelines` |
| Vite config, `base`, plugins | `vite` |
| Writing or debugging tests | `vitest` |
| WCAG, keyboard, screen readers | `accessibility` |
| LCP / INP / CLS, bundle budget | `core-web-vitals` |
| bun commands and APIs | `bun` |
| Keeping context clean, `run_silent` | `stay-sharp` |

A Tailwind v4 skill was evaluated (`lombiq/tailwind-agent-skills`) and
**rejected**: it is a sync harness that downloads source-available, non-open-source
docs and requires accepting an upstream licence, and it is oriented at v3→v4
migration. This project is greenfield, so the relevant v4 rules are captured in §6
instead.
