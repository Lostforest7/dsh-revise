import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
const browserPath = process.env.REVISE_CHROMIUM_PATH ?? (process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined)
export default defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 90_000, expect: { timeout: 12_000 },
  use: { browserName: 'chromium', launchOptions: { executablePath: browserPath }, viewport: { width: 1600, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './scripts/e2e-setup.ts',
})
