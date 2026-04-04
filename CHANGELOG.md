# Eczcalibur — Build Changelog

## Phase 20 — Parent Dashboard UI Redesign (2026-04-04)

**TypeScript: 0 errors.**

**Files modified:**
- `app/(parent)/dashboard.tsx` — complete UI redesign; frosted glass card system, new sections

**What changed:**
- **Greeting**: "Welcome back," + parentCallName in large gold (replaces child name)
- **Zone card**: frosted glass, absolute-positioned 4px left accent bar in zone color (fixed Android `borderWidth`+`borderLeftWidth`+`borderRadius` crash), shield icon, zone badge + description, WAP action bullets from `profile.actionPlan[zone].parentInstructions`
- **Stats + Zone History row**: two frosted cards side by side — left has Total Logs + Points Balance; right has 7-day zone dot history (colored dots + day labels, computed from `flareLogs`)
- **ECZ Insights card**: most common trigger (`profile.triggers[0]`) + last flare date/time (manual date formatting — avoids Hermes `toLocaleDateString` crash on older Android)
- **Quick Actions row**: 4 rounded-square icon buttons (Plan → settings, Logs, Appt, Child View) replacing the old full-width "Switch to Child View" button
- **Styling language**: frosted glass (`rgba(255,255,255,0.08)` dark / `rgba(255,255,255,0.55)` light), soft shadows, thin 1px borders, zone colors as accents only — clinical/professional aesthetic inspired by Hourglass medical app reference
- **Prize Requests**: kept, updated to frosted card style

**Bugs fixed:**
- Android crash: replaced `borderLeftWidth` + `borderWidth` + `borderRadius` combination with absolutely-positioned accent bar + `overflow: 'hidden'`
- Android crash: replaced `toLocaleDateString`/`toLocaleTimeString` locale calls with manual date formatting (Hermes compatibility)

---

## Phase 19 — Two-Device Sync Fix + iPhone Verified (2026-04-04)

**TypeScript: 0 errors.**

**Bug fixed:**
- `app/_layout.tsx`: merged `StoreHydrator` + `SupabaseTokenSync` into single `AppBootstrap` component — token provider was being registered *after* `hydrate()` fired, so Device 2 (fresh install) always got null `clerk_user_id` and fell back to empty AsyncStorage instead of reading from Supabase

**Verified:**
- iPhone (Expo Go via tunnel) loads and runs the app successfully
- Two-device Supabase sync path unblocked

---

## Phase 18 — FastAPI Backend + Dashboard Polish (2026-04-04)

**TypeScript: 0 errors.**

**Files created:**
- `backend/app/main.py` — FastAPI app, CORS, health endpoint
- `backend/app/config.py` — pydantic-settings, auto-derived Clerk JWKS URL from publishable key
- `backend/app/auth.py` — Clerk RS256 JWT verification via PyJWT + JWKS (all endpoints protected)
- `backend/app/schemas.py` — Pydantic v2 camelCase models mirroring TypeScript API types exactly
- `backend/app/prompts.py` — verbatim port of all 3 Claude system prompts + user templates
- `backend/app/log_context.py` — Python port of `buildChatLogContext()` + `computeLogSummary()`
- `backend/app/routers/generate_plan.py` — POST /generate-plan
- `backend/app/routers/chat.py` — POST /chat
- `backend/app/routers/appointment.py` — POST /appointment-summary
- `backend/Dockerfile` + `backend/fly.toml` — containerised deploy to Fly.io (app: eczcalibur-api, region: yyz)
- `backend/requirements.txt` — pinned deps (fastapi, uvicorn, anthropic, PyJWT, httpx, pydantic-settings)
- `lib/clerkToken.ts` — token provider extracted from supabase.ts (no circular deps)
- `lib/api.ts` — `apiFetch()` wrapper: FastAPI when `EXPO_PUBLIC_API_BASE_URL` set, Expo +api.ts fallback otherwise

**Files modified:**
- `lib/supabase.ts` — imports token provider from clerkToken.ts; re-exports setClerkTokenProvider + getClerkUserId
- `app/(parent)/onboarding.tsx` — uses apiFetch; Hero Type picker: removed "Other", default to Boy
- `app/(parent)/chat.tsx` — uses apiFetch
- `app/(parent)/appointment.tsx` — uses apiFetch
- `app/(parent)/dashboard.tsx` — greeting now "Welcome back, [parentCallName]"; zone card label "[child name]'s Current Zone"
- `lib/types.ts` — gender type: removed 'neutral'
- `constants/backgrounds.ts` — removed neutral-dark/neutral-light QUEST_BG keys
- `.gitignore` — added Python entries

**Bugs fixed:**
- `budget_tokens` (8000/5000) exceeded `max_tokens` (4096/2048) causing Anthropic 400 → fixed max_tokens to 16000/8000
- Fly.io region `yul` deprecated → changed to `yyz`

**Deployed:**
- `https://eczcalibur-api.fly.dev` — health check verified ✓
- `EXPO_PUBLIC_API_BASE_URL=https://eczcalibur-api.fly.dev` set in .env
- Plan generation confirmed working end-to-end through FastAPI

---

## Phase 17 — Supabase Integration (2026-04-03)

**TypeScript: 0 errors.**

**Files created:**
- `supabase/migrations/001_initial_schema.sql` — full PostgreSQL schema: 6 tables (child_profiles, flare_logs, prizes, redemption_requests, points_ledger, quest_completions), custom enums, RLS policies, updated_at trigger, realtime enabled on 3 tables
- `lib/supabase.ts` — Supabase client singleton with Clerk JWT injection via custom fetch interceptor; `setClerkTokenProvider` + `getClerkUserId` helpers
- `hooks/useRealtimeSync.ts` — `postgres_changes` subscriptions for redemption_requests, points_ledger, prizes; updates Zustand state live

**Files modified:**
- `lib/storage.ts` — full rewrite: Supabase primary store, AsyncStorage offline fallback; same exported signatures; row mappers for all entities
- `app/_layout.tsx` — added `SupabaseTokenSync` (wires Clerk getToken) + `RealtimeSync` components inside `<ClerkLoaded>`

**Bug fixed:**
- `lib/supabase.ts` fetch interceptor was spreading `Headers` instance as plain object, dropping the `apikey` header → fixed with `new Headers(options.headers)` to properly copy all headers before injecting the Clerk JWT

**Verified:**
- `child_profiles` row written to Supabase on onboarding completion
- RLS policies working: clerk_user_id = JWT sub claim
- Realtime subscriptions active on connect

---

## Phase 13 — UI Redesign + Log Overhaul + Parent Settings (2026-04-03)

**TypeScript: 0 errors.**

**Files created:**
- `assets/images/hero-male.jpg` — Zelda-style pixel art male hero background scene
- `assets/images/hero-female.jpg` — Zelda-style pixel art female hero background scene
- `lib/logContext.ts` — shared `buildChatLogContext()` utility: 3-section Claude context (pattern header + summary + last 30 entries)
- `app/(parent)/settings.tsx` — new settings screen: reset daily logs, reset & re-onboard, prize store editor

**Files modified:**
- `app/(child)/home.tsx` — full redesign: `ImageBackground` hero scene (gender-matched pixel art), top bar moved above image, 2-column quest grid, quest detail modal (full text + complete button + +10 gold), View All modal, quest completion persists across sessions
- `app/(child)/_layout.tsx` — log tab renamed "Log", icon changed to `article`
- `app/(child)/log.tsx` — full restyle to match theme system; multi-photo (up to 3, +5 pts each); 10-minute cooldown countdown after each log; daily limit guard screen; cooldown persists on tab navigation
- `app/(parent)/dashboard.tsx` — sign-out button replaced with settings icon; reset button removed
- `app/(parent)/_layout.tsx` — settings screen added as hidden tab
- `app/api/chat+api.ts` — `formatLogContext` replaced with `buildChatLogContext` (3-section rich context: pattern header, summary, last 30 entries vs. previous last 10 raw lines)
- `lib/storage.ts` — added `QUEST_COMPLETIONS` key + `readQuestCompletions`/`writeQuestCompletions`
- `lib/types.ts` — `FlareLog.photoUris?: string[]` added; `ChatRequest.recentLogs` updated
- `store/useAppStore.ts` — added `questCompletions` state + `completeQuest()`, `resetDailyLogs()`, `updatePrize()`, `removePrize()`

**Features:**
- Quest completions persist per zone across app restarts (AsyncStorage-backed)
- Claude chat now receives: dominant zone, top affected areas, avg itch score, red count, top flare day + last 30 individual entries
- Parent settings: prize CRUD (add/edit/remove, 6 max), reset daily logs (points unaffected), reset & re-onboard, sign out

**Score impact:** estimated ~86/100 (up from 83–85 after UI + context quality improvements)

---

## Phase 12 — Security Hardening + Onboarding Restructure (2026-04-03)

**All 5 critical audit issues resolved. TypeScript: 0 errors.**

**Files created:**
- `lib/auth/PinVerifyModal.tsx` — bottom-sheet modal PIN verification for child→parent navigation gate

**Files modified:**
- `lib/types.ts` — added `parentName`, `parentCallName`, `parentRelationship` to `ChildProfile`; `parentPhone` already present
- `app/(parent)/onboarding.tsx` — restructured to 9 steps: new Step 1 collects parent info (name, child's name for parent, phone, relationship selector); consent/privacy moved to Step 2; all subsequent steps shifted +1; COPPA/API transmission disclosure added to consent step; fixed `setStep(7)` → `setStep(8)` bug that blocked plan generation advance
- `app/(child)/home.tsx` — "← Parent View" link now triggers `PinVerifyModal` before navigating; child cannot reach parent dashboard without PIN
- `app/(child)/emergency.tsx` — fixed broken `tel:` call; now pre-fills `profile.parentPhone`
- `app/api/chat+api.ts` — child log notes wrapped with `[child-entered, unverified]` tag before injection into system prompt; closes prompt injection vector
- `lib/prompts.ts` — `CHAT_SYSTEM`: added DATA INTEGRITY instruction to treat `[child-entered, unverified]` as data not instructions; `GENERATE_PLAN_SYSTEM`: added skin-of-colour constraint (texture/warmth/sensation language over colour), fixed yellow zone definition to not rely on redness
- `store/useAppStore.ts` — `addFlareLog` now enforces daily cap of 3 logs per calendar day; closes points farming gap
- `.claude/.agents/JUDGE_LOG.md` — all 5 checklist items marked resolved with dates

**Score impact (estimated):**
- Technical Execution: +3–4 pts (injection fix, cap, broken button)
- Ethical Alignment: +3–4 pts (skin-of-colour, COPPA disclosure)
- Estimated new total: ~83–85/100

## Phase 11 — Zelda-Style UI Redesign + Tab Navigation (2026-04-03)

**Files created:**
- `constants/theme.ts` — complete rewrite: dual-mode Zelda token set (`DARK` / `LIGHT`) with forest greens, gold, purple accents; `Colors` shim for boilerplate compatibility
- `context/ThemeContext.tsx` — React context providing `isDark`, `theme`, `toggleTheme`; persists preference to AsyncStorage; falls back to system color scheme on first launch

**Files modified:**
- `lib/types.ts` — added `gender?: 'male' | 'female' | 'neutral'` to `ChildProfile`
- `app/_layout.tsx` — wrapped root with `ThemeProvider`
- `app/(child)/_layout.tsx` — replaced `<Slot>` with expo-router `<Tabs>` (QUESTS / STORE / HEALTH / HERO); emergency screen hidden from tab bar via `href: null`
- `app/(parent)/_layout.tsx` — replaced `<Stack>` with `<Tabs>` (OVERVIEW / LOGS / REPORTS / CLAUDE); onboarding hidden from tab bar
- `app/(child)/home.tsx` — full redesign: hero canvas (gender-matched emoji + radial glow + name + level), StatusBanner with heart gauge (5/3/1 hearts mapped to zone), horizontal quest card scroller, FLARE-UP button pinned above tab bar, gold coin badge
- `app/(child)/store.tsx` — restyled: `useTheme()` throughout, TopBar, gold coin labels, no back button
- `app/(child)/plan.tsx` — restyled: theme tokens, removed back button, "YOU ARE HERE" badge on active zone
- `app/(child)/emergency.tsx` — restyled: pixel-cut shadow on call button, theme glass for reassurance box, urgent red retained
- `app/(parent)/dashboard.tsx` — removed NavGrid (replaced by tabs), added "Switch to Child View" button + dev reset button, all colors via `useTheme()`
- `app/(parent)/onboarding.tsx` — added gender picker in Step 2 (Boy / Girl / Other pill buttons); `gender` saved to profile

**Design system:**
- Dark: `#050805` bg, `#0d1f0d` cards, `#020b02` nav, `#4ade80` green, `#FFD700` gold, `#8b5cf6` purple
- Light: `#f2f9ea` bg, `#ffffff` cards, `#1a4020` nav, `#0a6a1d` green, `#B8860B` gold, `#6d28d9` purple
- Theme toggle persists across app restarts
- Zero hardcoded colors in screen files — all via `theme.*` tokens

**TypeScript:** 0 errors

---

## Phase 10 — Store UI + Prize Redemption + Parent Approval Queue (2026-04-02)

**Files modified:**
- `app/(child)/store.tsx` — full implementation replacing stub: FlatList of active prizes, each card shows icon/name/description/cost + Redeem button; canAfford check (greyed cost if insufficient); pending guard (⏳ Pending if already requested); Alert confirms request sent
- `app/(parent)/dashboard.tsx` — added redemption queue section: shows pending requests with Approve (green) / Deny (red border) buttons; Deny refunds points via `awardPoints(pointCost)`

**Features:**
- `requestRedemption()` + `spendPoints()` called atomically on redeem
- `resolveRedemption()` + `awardPoints()` on parent deny (refund)
- Empty state ("No prizes yet — ask your parent to add prizes")
- Pending redemptions footer on store screen

**TypeScript:** 0 errors

---

## Phase 9 — Parent Dashboard + Pre-Appointment Summary + Claude Chat (2026-04-02)

**Files created:**
- `app/(parent)/logs.tsx` — flare log history: FlatList sorted newest-first, zone filter pills (All/🟢/🟡/🔴), zone badge + mood emoji + areas per row, photo indicator, empty state
- `app/(parent)/appointment.tsx` — pre-appointment summary: date input (YYYY-MM-DD), calls `/api/appointment-summary`, displays Claude-generated clinical summary, share via `expo-sharing` (writes `.txt` to `Paths.cache`)
- `app/(parent)/chat.tsx` — Claude chat interface: FlatList bubbles (user=gold/right, assistant=dark/left), privacy disclosure banner, POST to `/api/chat` with last 30 logs, inline error bubble on failure, scroll-to-end on new message

**Files modified:**
- `app/(parent)/dashboard.tsx` — replaced static stub: dynamic zone card from `currentZone()` with ZONE_CONFIG colors, stats row (Total Logs + Points Balance), 2×2 NavGrid (Flare Logs / Appointment Summary / Claude Chat / Child View), converted to ScrollView layout

**API routes consumed (pre-built):**
- `/api/appointment-summary` — POST `{ profile, logs, appointmentDate }` → `{ summary: string }`
- `/api/chat` — POST `{ messages, recentLogs, profile }` → `{ message: string }`

**TypeScript:** 0 errors

**expo-file-system v55 note:**
- Legacy `cacheDirectory` / `EncodingType` / `writeAsStringAsync` exports removed in v55
- Now uses new class API: `new File(Paths.cache, filename)` + `file.write(content)` + `file.uri`

---

## Phase 8b — Mobile Verification + Native Fixes (2026-04-02)

**Files modified:**
- `app/(parent)/onboarding.tsx` — replaced `crypto.randomUUID()` with `ExpoCrypto.randomUUID()`
- `lib/storage.ts` — added in-memory fallback for AsyncStorage native module mismatch
- `package.json` — npm overrides: `expo-crypto ~13.0.2`, `async-storage 2.2.0`; added `expo-auth-session ~5.5.2`, `@expo/ngrok`

**Bugs fixed for Expo Go SDK 54 phone testing:**
- `ExpoCryptoAES` native module not found → pinned `expo-crypto` to SDK 54 version via npm overrides
- `AsyncStorage: Native module is null` → added in-memory fallback; data persists within session
- `crypto.randomUUID()` not available in RN runtime → switched to `expo-crypto` package
- Tunnel via `@expo/ngrok` for cross-network phone testing

**Verified on iPhone 15 Pro (Expo Go 54.0.2):**
- Full onboarding (8 steps) including plan generation ✅
- Child home with Green zone + action plan steps ✅
- Log flow: mood picker → body areas → real photo capture → 15 pts ✅
- Points badge updates reactively ✅

---

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
