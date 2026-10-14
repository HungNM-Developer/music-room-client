import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the real server (YOUTUBE_FAKE=1) and the Next app with the fake
 * player (NEXT_PUBLIC_E2E=1). Locally it reuses servers already running on
 * 3000/3001; in CI it starts them.
 */
const SERVER_PORT = 3001;
const WEB_PORT = 3000;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    ...devices['Pixel 7'],
    // Uses the locally installed Chrome (isolated temporary profile); CI can drop this line
    // after `npx playwright install chromium`.
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../music-room-server',
      port: SERVER_PORT,
      reuseExistingServer: true,
      env: {
        PORT: String(SERVER_PORT),
        PUBLIC_URL: `http://localhost:${WEB_PORT}`,
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
        YOUTUBE_FAKE: '1',
        // Every E2E browser shares 127.0.0.1; lift R-43 so the suite is not rate-limited.
        JOIN_LIMIT_PER_MINUTE: '1000',
        DATA_DIR: './.data',
      },
    },
    {
      command: `npx next dev -p ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: true,
      env: { NEXT_PUBLIC_SERVER_URL: `http://localhost:${SERVER_PORT}`, NEXT_PUBLIC_E2E: '1' },
    },
  ],
});
