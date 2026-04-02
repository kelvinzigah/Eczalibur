import { test, expect } from '@playwright/test';

/**
 * Smoke test — verifies the app loads and routes to sign-in.
 * Requires `npx expo start --web` to be running on port 8081.
 */
test('app loads and shows sign-in screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/eczcalibur/i)).toBeVisible({ timeout: 15_000 });
});

test('sign-in screen has username + password fields', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('Username')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder('Password')).toBeVisible({ timeout: 15_000 });
});
