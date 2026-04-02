import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Eczcalibur — targets Expo web dev server.
 *
 * Start the app first:  npx expo start --web
 * Run tests:            npm run test:e2e
 *
 * All tests run in a Pixel 5 viewport to simulate the mobile experience.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:8083',
    ...devices['Pixel 5'],
    // Record a trace on first retry to help diagnose failures
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
