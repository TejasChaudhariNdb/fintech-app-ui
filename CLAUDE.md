# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Arthavi user app (`app.arthavi.com`): a Next.js 16 / React 19 PWA for tracking Indian family portfolios (mutual funds, stocks, FDs/PPF, gold, insurance, real estate, goals, SIPs). It is a pure client of the FastAPI backend in `../backend` (separate git repo; see `../backend/CLAUDE.md`). There is no shared package or generated client: every TypeScript response type is hand-written to match the Python routes.

## Commands

```bash
npm install
npm run dev        # next dev --webpack (webpack is required by @ducanh2912/next-pwa; PWA is disabled in development)
npm run build
npm run lint       # eslint (eslint-config-next)
npx tsc --noEmit   # type check
```

There are no tests. The backend URL comes from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`); run the backend with `uvicorn app.main:app --reload` from `../backend`. All env vars are `NEXT_PUBLIC_*` and therefore shipped to the browser.

## Architecture

- App Router with route groups: `app/(auth)` (login, register, Google callback, forgot password, and `/auth`, which also accepts `?impersonate_token=` from the admin dashboard), `app/(dashboard)` (authenticated app; `layout.tsx` holds the auth redirect, nav, AppLock, AI chat, FCM, What's New, demo ribbon), `app/demo`, `app/unsubscribe`.
- Everything is client-rendered (`"use client"`); there are no server components fetching data and no Next API routes. `@/*` maps to the repo root.
- `app/providers.tsx`: GoogleOAuthProvider → `ProfileProvider` → ThemeProvider (dark default), plus PostHog init and a chunk-load-error auto-reload.
- `components/features/` holds the feature UI (cards, modals, forms, charts using recharts and lightweight-charts); `components/ui/` holds primitives.

### `lib/api.ts` is the backend contract

All backend calls go through the `api` object. `api.fetch(endpoint, { cacheKey? })`:
- Reads the JWT from `localStorage.access_token` and sends `Authorization: Bearer`. On 401 (non-`/auth` endpoints) it clears `access_token`, `user_email`, `active_profile_id` and redirects to `/auth?session_expired=true`.
- **Profile scoping**: appends `profile_id=<localStorage.active_profile_id>` only to **GET** requests whose path matches the `scopedPrefixes` list (around line 152). A new per-profile GET endpoint must be added to that list or the family switcher won't affect it. Mutations must pass `profile_id` explicitly; if omitted, the backend silently uses the user's default profile.
- **Offline cache**: when `cacheKey` is given, successful responses are stored in `localStorage` as `{user_email}:{cacheKey}:{profileId}` and served on any non-auth failure (including 500s and timeouts). After a mutation, call `api.clearCache([...keys])` (prefix-matches `key-*`) or `api.clearPortfolioCache()` so stale data isn't served.
- **Demo mode**: blocks POST/PUT/PATCH/DELETE for the demo account (`NEXT_PUBLIC_DEMO_EMAIL` or `sessionStorage.is_demo_session`) by dispatching `show-demo-restriction`, except for `/auth/`, `/updates/`, `/analytics/`, `/fcm/`, `/ai/`. This is client-side only; the backend does not enforce it.
- Requests time out after 25s. Error messages come from the backend's `detail` field; `reactivation_token` is attached to the thrown error for deactivated Google accounts.
- Multipart uploads (CAS PDF, CSV, tradebook, demat reconcile, holdings import) and AI streaming bypass `api.fetch` and duplicate the header/401/`profile_id` handling inline. Keep them in sync when changing auth or scoping behaviour.

### Profiles (family)

`context/ProfileContext.tsx` loads `/profiles`, stores the selection in `localStorage.active_profile_id` (`"all"` = All Family aggregate, or a numeric id), and forces the single profile when only one exists. Pages read `activeProfileId` from `useProfile()` and refetch in a `useEffect` keyed on it. Write operations cannot target `"all"`; the backend rejects that with 400.

### Business logic location

Financial numbers (XIRR, CAGR, P&L, allocations, NAVs, capital gains) are computed by the backend; the app only displays them. Exceptions that duplicate backend logic and must be kept consistent with `../backend/app/routes/fixed_income.py` and `real_estate.py`:
- `components/features/FixedIncomeForm.tsx` computes FD/RD/PPF maturity and sends it as `maturity_amount`. The backend stores the client value and only computes its own when it is missing or ≤ 0, so this TS code is the effective source of truth for user-entered deposits.
- `components/features/RealEstateForm.tsx` computes CAGR for display.
- `lib/assetPreferences.ts` mirrors the keys and defaults in `../backend/app/services/asset_preferences.py` (net-worth asset toggles, stored per profile in localStorage and synced to the backend `feature_flags`).

### Other integrations

- Analytics: `lib/analytics.ts` (PostHog via `analytics.track({ name, properties })`, `identifyUser`, `reset`) and `components/services/GoogleAnalytics.tsx`.
- Push: `lib/firebase.ts`, `hooks/useFcmToken.ts`, `components/FcmManager.tsx`, service worker at `public/firebase-messaging-sw.js`.
- Privacy: `context/PrivacyContext.tsx` + `components/ui/PrivacyMask.tsx` mask amounts; `AppLock` gates the dashboard.
