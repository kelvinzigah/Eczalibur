# Eczcalibur — Architectural Decisions

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

### D-015: Pin expo-crypto and async-storage via npm overrides
**Decision:** `package.json` uses `"overrides"` to pin `expo-crypto` to `~13.0.2` and `@react-native-async-storage/async-storage` to `2.2.0`.

**Rationale:** `@clerk/clerk-expo` transitively pulls in `expo-crypto@55.x` (the SDK 55 version). Expo Go SDK 54 doesn't include the v55 native module. The override forces the SDK-54-compatible version across all transitive dependencies without modifying any third-party package.
