import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    timeout: 30000,
    expect: {
        timeout: 5000,
    },
    use: {
        baseURL: process.env.CAREBRIDGE_BASE_URL || 'http://127.0.0.1:8000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
