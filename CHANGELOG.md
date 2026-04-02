# Eczcalibur — Build Changelog

## Phase 8 — Logging Flow + Points System (2026-04-02)

**Files modified:**
- `app/(child)/log.tsx` — full 3-step log screen replacing stub

**Features implemented:**
- Step 1: Mood face picker — 5 illustrated options (😊 Great / 🙂 Okay / 😕 Itchy / 😣 Very Itchy / 😭 Painful) → moodScore 1–5
- Step 2: Body area chips — all 10 areas, parent's monitored areas pre-highlighted with 📍 marker
- Step 3: Optional photo via expo-image-picker (+5 bonus pts); preview + remove supported
- Submit: writes FlareLog to AsyncStorage, awards 10 pts (or 15 with photo)
- Confirmation screen shows points earned + running total
- Returns to child home; points badge updates reactively

**Verified end-to-end:** mood → areas → submit (no photo) → "Quest logged! You earned 10 points. Total: ⭐ 10" → home shows ⭐ 10 and Prize Store (10 pts)

---

## Phase 1 — Clerk Auth + Routing (2026-04-02)

**Files created/modified:**
- `app/_layout.tsx` — ClerkProvider + ClerkLoaded root wrapper
- `app/index.tsx` — role-based redirect (signed-in → parent dashboard, else → sign-in)
- `app/(auth)/_layout.tsx` — auth group layout
- `app/(auth)/sign-in.tsx` — email/password sign-in with error handling
- `app/(parent)/_layout.tsx` — Clerk auth guard
- `app/(parent)/dashboard.tsx` — stub with "Switch to Child View" button
- `app/(child)/_layout.tsx` — Clerk auth guard + PIN gate
- `app/(child)/home.tsx` — stub child home screen
- `lib/auth/PinGate.tsx` — 4-digit PIN overlay (set + verify, expo-secure-store)
- `DECISIONS.md` — created (D-001 through D-005)

**Dependencies installed:**
- `@clerk/clerk-expo` v2.19.31
- `@anthropic-ai/sdk`
- `@react-native-async-storage/async-storage`
- `zustand`
- `expo-image-picker`
- `expo-file-system`
- `expo-sharing`
- `expo-secure-store`

**Deleted:**
- `app/(tabs)/` (boilerplate)
- `app/modal.tsx` (boilerplate)

**Status:** TypeScript check passes (0 errors). Auth flow complete.

---

## Phases 2–5 — Types, Prompts, Storage, API Routes (2026-04-02)

**Files created:**
- `lib/types.ts` — all TypeScript interfaces (Zone, ActionPlan, ChildProfile, FlareLog, Prize, etc.)
- `lib/prompts.ts` — 3 Claude system prompts with ethical guardrails
- `lib/storage.ts` — AsyncStorage typed helpers + hydrateAll()
- `lib/weather.ts` — Open-Meteo geocoding + weather fetch
- `store/useAppStore.ts` — Zustand store with hydration bootstrap
- `app/api/generate-plan+server.ts` — Claude Opus 4.6 action plan generation
- `app/api/chat+server.ts` — Claude streaming parent chat
- `app/api/appointment-summary+server.ts` — Claude pre-appointment summary

**Status:** TypeScript clean. API routes server-side only (Anthropic client inside handlers).

---

## Phase 6 — Parent Onboarding Wizard (2026-04-02)

**Files created/modified:**
- `app/(parent)/onboarding.tsx` — 8-step wizard (consent, child details, body areas, medications, triggers, generate plan, plan review, prizes)
- `components/parent/OnboardingStep.tsx` — progress dots + step header component
- `components/parent/BodyMap.tsx` — interactive SVG front/back body silhouette (react-native-svg)
- `app/(auth)/sign-in.tsx` — fixed: needs_first_factor + needs_second_factor handling; otp/otp2 stages
- `app/(parent)/dashboard.tsx` — hydration guard + onboarding redirect

**Dependencies installed:** `react-native-svg`

**Fixes applied:**
- Anthropic client moved inside POST handlers (browser bundling error)
- SVG body map: onPress on shape elements directly (Pressable can't be child of Svg)
- Clerk sign-in: username is the correct identifier (not email)
- Clerk 2FA: dynamic strategy detection from supportedSecondFactors

**Visual verification:** Onboarding steps 1–8 confirmed working in browser. Body map renders with red highlight on tap.

---

## Phase 7 — Child Home + Emergency + Red Zone (2026-04-02)

**Files created:**
- `app/(child)/home.tsx` — zone banner, quest steps (from action plan), points badge, emergency button pinned at bottom
- `app/(child)/emergency.tsx` — fullscreen Red zone takeover, numbered steps, Call Parent button, "I'm OK" exit
- `app/(child)/plan.tsx` — all 3 zones with "YOU ARE HERE" badge on current zone
- `app/(child)/log.tsx` — stub (Phase 8)
- `app/(child)/store.tsx` — stub (Phase 10)

**Status:** All 3 child screens verified end-to-end.

---

## Phase 7 Verification + Infrastructure Fixes (2026-04-02)

**Bug fixes applied:**
- Renamed `app/api/*+server.ts` → `*+api.ts` — Expo Router requires `+api.ts` extension for API routes (`+server.ts` caused 404s)
- Changed `app.json` `web.output` from `"static"` to `"server"` — required for API routes to be served in dev
- Fixed sign-in `placeholder` from `"Email"` to `"Username"` (field takes username identifier, not email)
- Added `localStorage` fallback in `lib/auth/PinGate.tsx` — `expo-secure-store` not available on web

**Playwright E2E infrastructure added:**
- `playwright.config.ts` — Pixel 5 viewport, port 8083 base URL
- `e2e/smoke.spec.ts` — app load + sign-in field checks
- `e2e/phases1-7.spec.ts` — full onboarding + child screens verification suite
- `test:e2e` and `test:e2e:ui` scripts in `package.json`
- Added `test-results/`, `.claude/`, `playwright-report/` to `.gitignore`

**End-to-end verification (Playwright MCP):**
- Sign-in with `zigahtest` / `zigahk2004` → onboarding auto-redirected ✅
- Steps 1–8 completed: consent, child details, body map (SVG chips), medications, triggers, plan generation, review, prizes ✅
- Claude generated full 3-zone WAP with Montreal weather context (74% humidity) and `[DOCTOR TO CONFIRM]` markers ✅
- Finish Setup → dashboard ("TestChild's Quest", 🟢 Green zone) ✅
- Switch to Child View → PIN gate (localStorage fallback) → set PIN 1234 ✅
- Child home: zone banner, quest steps from plan, points badge, all buttons ✅
- Emergency: fullscreen red, steps from plan, "I'm OK" returns to home ✅
- Plan screen: 3 zone cards, "YOU ARE HERE" on Green ✅

---
