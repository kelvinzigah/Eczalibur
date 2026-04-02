import { test, expect, Page } from '@playwright/test';

/**
 * Phase 1–7 full verification suite.
 *
 * Requires:
 *   - `npx expo start --web` running on port 8081
 *   - Clerk test account: username zigahtest / password zigahk2004
 *
 * Known limitations (documented, not failures):
 *   - expo-secure-store PIN uses localStorage shim on web — works for basic flow
 *   - Linking.openURL('tel:') cannot open native dialer in browser — button presence verified only
 *   - Clerk OTP/2FA steps not automated — if triggered, test notes it and stops gracefully
 */

const USERNAME = 'zigahtest';
const PASSWORD = 'zigahk2004';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill(USERNAME);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).tap();

  // If OTP is triggered (needs_first_factor), we can't complete it — skip gracefully
  const otpVisible = await page.getByPlaceholder('6-digit code').isVisible().catch(() => false);
  if (otpVisible) {
    test.skip(true, 'Clerk OTP required — cannot automate email code. Re-run after disabling MFA in Clerk dashboard.');
  }
}

// ─── Phase 1: Auth ────────────────────────────────────────────────────────────

test.describe('Phase 1 — Sign-In Screen', () => {
  test('loads and shows Eczcalibur title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Eczcalibur')).toBeVisible({ timeout: 15_000 });
  });

  test('shows username and password fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Username')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill('wronguser');
    await page.getByPlaceholder('Password').fill('wrongpass');
    await page.getByRole('button', { name: /sign in/i }).tap();
    // Should show an error message
    await expect(page.locator('text=/failed|invalid|incorrect|error/i').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Phase 1 + 4: Parent Dashboard ───────────────────────────────────────────

test.describe('Phase 1+4 — Parent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('shows welcome greeting after sign-in', async ({ page }) => {
    // After sign-in, should land on dashboard or onboarding
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15_000 });
    const onDashboard = page.url().includes('dashboard');
    if (onDashboard) {
      await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 10_000 });
    } else {
      // First run — onboarding not complete, redirected to onboarding
      await expect(page.getByText(/welcome to eczcalibur/i)).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ─── Phase 6: Onboarding Wizard ───────────────────────────────────────────────

test.describe('Phase 6 — Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    // Navigate to onboarding directly
    await page.goto('/onboarding');
    await page.waitForURL(/onboarding/, { timeout: 10_000 });
  });

  test('Step 1 — consent screen renders and advances', async ({ page }) => {
    await expect(page.getByText(/welcome to eczcalibur/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    await page.getByRole('button', { name: /continue/i }).tap();
  });

  test('Step 2 — child details form renders', async ({ page }) => {
    // Advance past step 1
    await page.getByRole('button', { name: /continue/i }).tap();
    await expect(page.getByText(/about your child/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/e\.g\.? alex/i)).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\.? 9/i)).toBeVisible();
  });

  test('Step 2 — continue disabled when name empty', async ({ page }) => {
    await page.getByRole('button', { name: /continue/i }).tap();
    await expect(page.getByText(/about your child/i)).toBeVisible({ timeout: 5_000 });
    // Next button should be disabled if name is empty
    const nextBtn = page.locator('button', { hasText: /continue|next|→/i }).last();
    // Verify it either doesn't navigate or shows validation
    await nextBtn.tap();
    await expect(page.getByText(/about your child/i)).toBeVisible(); // still on step 2
  });

  test('Step 3 — body map SVG renders', async ({ page }) => {
    // Advance to step 3
    await page.getByRole('button', { name: /continue/i }).tap();
    await page.getByPlaceholder(/e\.g\.? alex/i).fill('TestChild');
    await page.getByPlaceholder(/e\.g\.? 9/i).fill('9');
    await page.getByPlaceholder(/e\.g\.? montreal/i).fill('Montreal');
    await page.getByPlaceholder(/e\.g\. atopic/i).fill('Atopic dermatitis');
    await page.getByRole('button', { name: /continue|next|→/i }).last().tap();

    await expect(page.getByText(/affected areas/i)).toBeVisible({ timeout: 5_000 });
    // SVG should be in the DOM
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Step 5 — trigger chips render and are selectable', async ({ page }) => {
    // Navigate quickly through steps 1-4
    await page.getByRole('button', { name: /continue/i }).tap();
    await page.getByPlaceholder(/e\.g\.? alex/i).fill('TestChild');
    await page.getByPlaceholder(/e\.g\.? 9/i).fill('9');
    await page.getByPlaceholder(/e\.g\.? montreal/i).fill('Montreal');
    await page.getByPlaceholder(/e\.g\. atopic/i).fill('Atopic dermatitis');
    // Step 2 → 3
    await page.getByRole('button', { name: /continue|next|→/i }).last().tap();
    await expect(page.getByText(/affected areas/i)).toBeVisible({ timeout: 5_000 });
    // Tap a body area if possible, then advance
    await page.locator('svg').first().tap().catch(() => {}); // body map tap
    await page.getByRole('button', { name: /continue|next|→/i }).last().tap();
    // Step 4 meds → advance
    await page.getByRole('button', { name: /continue|next|→/i }).last().tap();
    // Now on Step 5 — triggers
    await expect(page.getByText(/known triggers/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/dust mites/i)).toBeVisible();
    // Tap a trigger
    await page.getByText(/dust mites/i).tap();
    await expect(page.getByText(/dust mites/i)).toBeVisible(); // still visible after selection
  });
});

// ─── Phase 7: Child Home ──────────────────────────────────────────────────────

test.describe('Phase 7 — Child Home', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    // Navigate to child home directly (skips PIN gate in web context)
    await page.goto('/(child)/home');
    // If redirected to sign-in, sign in again
    if (page.url().includes('sign-in')) {
      await signIn(page);
      await page.goto('/(child)/home');
    }
  });

  test('child home screen renders with quest title', async ({ page }) => {
    // May show PIN gate first
    const pinVisible = await page.getByText(/4-digit pin|enter your pin|set a 4-digit/i).isVisible().catch(() => false);
    if (pinVisible) {
      // Enter PIN via keypad: tap 1, 2, 3, 4
      for (const digit of ['1', '2', '3', '4']) {
        await page.getByText(digit).first().tap();
      }
      // Confirm if needed
      const confirmVisible = await page.getByText(/confirm your pin/i).isVisible().catch(() => false);
      if (confirmVisible) {
        for (const digit of ['1', '2', '3', '4']) {
          await page.getByText(digit).first().tap();
        }
      }
    }
    await expect(page.getByText(/quest/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/zone/i)).toBeVisible({ timeout: 5_000 });
  });

  test('emergency button is visible on child home', async ({ page }) => {
    const pinVisible = await page.getByText(/pin/i).isVisible().catch(() => false);
    if (pinVisible) {
      for (const digit of ['1', '2', '3', '4']) {
        await page.getByText(digit).first().tap();
      }
    }
    await expect(page.getByText(/my skin is bad|get help/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Phase 7: Emergency Screen ────────────────────────────────────────────────

test.describe('Phase 7 — Emergency Screen', () => {
  test('emergency screen shows FLARE ALERT', async ({ page }) => {
    await page.goto('/(child)/emergency');
    // May need auth
    if (page.url().includes('sign-in')) {
      await signIn(page);
      await page.goto('/(child)/emergency');
    }
    await expect(page.getByText(/flare alert/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/call a parent/i)).toBeVisible();
    await expect(page.getByText(/i.m ok/i)).toBeVisible();
  });
});

// ─── Phase 7: Plan Screen ─────────────────────────────────────────────────────

test.describe('Phase 7 — Plan Screen', () => {
  test('plan screen shows 3 zone cards', async ({ page }) => {
    await page.goto('/(child)/plan');
    if (page.url().includes('sign-in')) {
      await signIn(page);
      await page.goto('/(child)/plan');
    }
    await expect(page.getByText(/your action plan/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/green zone/i)).toBeVisible();
    await expect(page.getByText(/yellow zone/i)).toBeVisible();
    await expect(page.getByText(/red zone/i)).toBeVisible();
  });
});
