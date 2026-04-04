# Eczcalibur — Architectural Decisions

## Phase 21 — MAVL Watch Feature

### D-026: Watch photos stored in Supabase only — no AsyncStorage fallback
**Decision:** `appendWatchPhoto` writes only to Supabase. No local AsyncStorage backup for watch photos.

**Rationale:** Base64-encoded images (even compressed at 1200px/0.75) can exceed 500 KB each. AsyncStorage has a 6 MB practical limit across all keys. Storing 10 photos locally would exhaust it. Supabase is the authoritative store; offline photo logging is deferred.

**Impact:** `lib/storage.ts` `appendWatchPhoto` — no `KEYS` entry, Supabase-only insert.

---

### D-027: `expo-file-system/legacy` for base64 reads in React Native
**Decision:** Photos are read as base64 using `readAsStringAsync(uri, {encoding: 'base64'})` from `expo-file-system/legacy`, not via `fetch(uri).blob()` + `FileReader`.

**Rationale:** `FileReader` is a browser-only Web API. React Native's Hermes engine does not implement it. The `/legacy` export of `expo-file-system` (v55) retains the `readAsStringAsync` API that works natively.

**Impact:** `app/(parent)/watch-detail.tsx` import and base64 encoding path.

---

### D-028: `_MAX_B64_BYTES` must be module-level, not a Pydantic model class variable
**Decision:** Size limits used inside `@field_validator` functions are defined as module-level constants, not class-level attributes on the Pydantic model.

**Rationale:** Pydantic v2 treats any underscore-prefixed class variable as a `ModelPrivateAttr`. Accessing `WatchPhoto._MAX_B64_BYTES` from a validator returns the descriptor object, not the int — causing `TypeError: '>' not supported between instances of 'int' and 'ModelPrivateAttr'` on every request.

**Impact:** `backend/app/schemas.py` — `_MAX_PHOTO_B64_BYTES = 2_800_000` at module level.

---

### D-029: Zustand v5 store destructure must include all reactive fields
**Decision:** All Zustand state fields that a component depends on for re-renders must appear explicitly in the `useAppStore()` destructure call.

**Rationale:** Zustand v5 uses shallow comparison of the destructured values to decide re-renders. Fields omitted from the destructure are never subscribed to, so the component won't re-render when they change. `watchConfigs` was omitted from `dashboard.tsx`, causing the Watch banner to not update after `addWatchConfig()`.

**Impact:** `app/(parent)/dashboard.tsx` — `watchConfigs` added to destructure.

---

## Phase 12 — Security Hardening

### D-015: Bidirectional PIN gate — both directions require PIN
**Decision:** PinGate (child layout) guards parent→child. A new `PinVerifyModal` guards child→parent. Only the parent (who knows the PIN) can switch modes in either direction.

**Rationale:** On the child's device, the child should be locked into child view. Without the reverse gate, tapping "← Parent View" bypassed all security. The modal approach avoids wrapping the parent layout in PinGate (which would break fresh app open on the parent's own phone).

**Impact:** `lib/auth/PinVerifyModal.tsx` — verify-only modal, no set-PIN flow. `app/(child)/home.tsx` — Parent View link now calls `setShowParentPin(true)` instead of navigating directly.

---

### D-016: Prompt injection mitigation — delimiter tagging, not stripping
**Decision:** Child log notes are prefixed with `[child-entered, unverified]` before injection into the Claude system prompt. The system prompt explicitly instructs Claude to treat that tag as data, not instructions.

**Rationale:** Stripping or escaping notes entirely would destroy legitimate log data. Delimiter tagging preserves the data while signalling its source to Claude and providing an explicit override-resistance instruction in the system prompt.

**Impact:** `app/api/chat+api.ts` `formatLogContext` + `lib/prompts.ts` `CHAT_SYSTEM`.

---

### D-017: Daily log cap at 3, not 1 — deduplication not appropriate
**Decision:** `addFlareLog` silently drops any log attempt beyond 3 per calendar day. No deduplication by content or timestamp proximity.

**Rationale:** A child can legitimately have multiple distinct flares in a day. Deduplication by date would block valid data. 3 is a reasonable medical ceiling for reportable events in one day, and closes the points farming gap without over-restricting real use.

**Impact:** `store/useAppStore.ts` `addFlareLog`.

---

### D-018: Parent info collected first in onboarding (Step 1)
**Decision:** Onboarding starts with parent name, what the child calls them, phone number, and relationship. Consent/privacy is Step 2. Child details are Step 3 onward.

**Rationale:** Phone number is critical for the emergency screen and belongs to the parent, not the child profile. Collecting it first ensures it's never skipped. It also personalises the experience immediately — the app knows the parent's name before asking about the child.

**Impact:** `app/(parent)/onboarding.tsx` restructured to 9 steps. `ChildProfile` gains `parentName`, `parentCallName`, `parentRelationship`.

---

## Phase 1 — Auth & Routing

### D-001: Single Clerk account (parent only), child access via PIN
**Decision:** Only the parent creates a Clerk account. Child access is implemented as a PIN-gated route group within the parent's session — not a separate Clerk account or role.

**Rationale:** SRD specifies "child login is PIN-based — no email required" and "session persistence: parent stays logged in; child view accessible via PIN within the same app session." A second Clerk account for the child would add unnecessary complexity for a hackathon build.

**Impact:** `/(child)` routes are guarded by `PinGate` (expo-secure-store), not a Clerk role check. `/(parent)` routes are guarded by Clerk `isSignedIn`.

---

### D-002: Env var prefix is EXPO_PUBLIC_, not NEXT_PUBLIC_
**Decision:** Clerk publishable key is stored as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`.

**Rationale:** Expo's Metro bundler only inlines env vars prefixed with `EXPO_PUBLIC_`. `NEXT_PUBLIC_` is a Next.js convention and does not work in Expo.

---

### D-003: ClerkLoaded at root, no isLoaded checks in screens
**Decision:** Root layout wraps entire app in `<ClerkLoaded>`. Individual screens do not check `isLoaded`.

**Rationale:** `ClerkLoaded` guarantees Clerk is initialized before any child renders, eliminating flash-of-wrong-state and scattered `if (!isLoaded) return null` guards.

---

### D-004: tokenCache from @clerk/clerk-expo/token-cache
**Decision:** Using the built-in `tokenCache` export from `@clerk/clerk-expo/token-cache` (v2.x pattern).

**Rationale:** `@clerk/clerk-expo` v2+ ships a built-in token cache backed by expo-secure-store. The older manual adapter pattern is deprecated.

---

### D-005: Child PIN stored in expo-secure-store, not AsyncStorage
**Decision:** The child PIN is stored via `expo-secure-store` (encrypted), not AsyncStorage.

**Rationale:** The PIN is a secret credential. AsyncStorage is unencrypted. expo-secure-store uses the device keychain/keystore.

---

## Phase 6 — Parent Onboarding Wizard

### D-006: Anthropic client initialised inside POST handler, not at module level
**Decision:** `new Anthropic(...)` is called inside each API route's POST function, not at module scope.

**Rationale:** Expo Metro bundles `+server.ts` files for the client too during development. A module-level `new Anthropic()` triggers the "running in a browser-like environment" error. Moving it inside the handler means it only executes server-side at request time.

---

### D-007: Body area selection uses SVG body map, not text chips
**Decision:** Step 3 of onboarding uses an interactive SVG front/back silhouette (`components/parent/BodyMap.tsx`) instead of text chip buttons.

**Rationale:** Tapping a visual body region is faster and less error-prone than reading a list of anatomical labels, especially for parents under stress during a flare.

**Impact:** `react-native-svg` added as a dependency. SVG shape `onPress` used directly — `Pressable` cannot be a child of `Svg`.

---

### D-008: Clerk sign-in uses username, not email
**Decision:** The Clerk identifier for sign-in is the username, not the email address.

**Rationale:** Clerk instance is configured with username as the primary identifier. Email-only login returns incorrect-credential errors even with correct email/password.

---

## Phase 7 — Child Home + Emergency + Red Zone

### D-010: API routes use +api.ts extension, not +server.ts
**Decision:** Expo API route files are named `*+api.ts` (e.g. `generate-plan+api.ts`), not `*+server.ts`.

**Rationale:** Expo Router requires the `+api.ts` suffix to identify server-side API routes. Files with `+server.ts` are treated as page routes (triggering "missing default export" warnings) and return 404 on all requests. Discovered during Phase 7 E2E verification.

---

### D-011: web.output must be "server" for API routes in dev
**Decision:** `app.json` `web.output` is set to `"server"`, not `"static"`.

**Rationale:** `"static"` output mode disables server-side route handling entirely. API routes only work with `"server"` output. This has no impact on native builds.

---

### D-012: PinGate uses localStorage fallback on web
**Decision:** `lib/auth/PinGate.tsx` uses a `storage` abstraction: `expo-secure-store` on native, `localStorage` on web (`Platform.OS === 'web'`).

**Rationale:** `expo-secure-store` throws at runtime on web. The PIN is not sensitive enough to block web testing. Native builds continue to use the encrypted keychain.

---

### D-009: Red zone is a fullscreen takeover, not a modal
**Decision:** The Red zone emergency screen (`app/(child)/emergency.tsx`) replaces the entire screen via `router.replace`, not a modal overlay.

**Rationale:** For a child in distress, fullscreen red creates maximum visual urgency and eliminates the possibility of accidentally dismissing it. Parent must explicitly dismiss from a dedicated button.

---

## Phase 8b — Native Compatibility

### D-013: Use expo-crypto instead of global crypto API
**Decision:** All `crypto.randomUUID()` calls in React Native code use `ExpoCrypto.randomUUID()` from `expo-crypto`.

**Rationale:** The global `crypto.randomUUID()` is a Web API; it is available in browsers and Node.js but not reliably in the React Native / Hermes runtime (especially inside Expo Go). `expo-crypto` provides a cross-platform implementation.

---

### D-014: In-memory fallback for AsyncStorage
**Decision:** `lib/storage.ts` maintains a `Map<string, string>` mirror of all writes. If AsyncStorage native module throws (native module null), reads fall back to the map and writes are silently skipped for the native layer.

**Rationale:** React Native JS bundle version (0.81.5) and Expo Go SDK 54 native runtime (0.79.x) have a minor version mismatch that causes `RNCAsyncStorage` to be unregistered. The fallback lets the full app run correctly within a session; data doesn't survive cold restarts but this is acceptable for hackathon demos and dev testing.

---

### D-016: expo-file-system v55 uses class-based File API
**Decision:** File writes use `new File(Paths.cache, filename)` + `file.write(content)`, not the legacy `writeAsStringAsync` / `cacheDirectory` / `EncodingType` exports.

**Rationale:** expo-file-system v55 removed the legacy functional exports from the main package entry. The legacy API is still accessible via `expo-file-system/legacy` but throws at runtime from the main entry. The new class-based API is synchronous for writes and provides the `file.uri` string for expo-sharing.

---

### D-015: Pin expo-crypto and async-storage via npm overrides
**Decision:** `package.json` uses `"overrides"` to pin `expo-crypto` to `~13.0.2` and `@react-native-async-storage/async-storage` to `2.2.0`.

**Rationale:** `@clerk/clerk-expo` transitively pulls in `expo-crypto@55.x` (the SDK 55 version). Expo Go SDK 54 doesn't include the v55 native module. The override forces the SDK-54-compatible version across all transitive dependencies without modifying any third-party package.
