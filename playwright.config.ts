import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'evidence/test-results/playwright-report' }],
  ],
  use: {
    trace: 'on-first-retry',
  },
});
