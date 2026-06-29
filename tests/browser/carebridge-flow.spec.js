import { expect, test } from '@playwright/test';

test.describe('CareBridge core flow', () => {
    test('login page exposes demo access and recovery links', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Create new account' })).toBeVisible();
        await expect(page.getByText('Demo Accounts')).toBeVisible();
    });

    test('dispatcher can open command surfaces after login', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: /Dispatcher/i }).click();
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByText('Rejected Patient Placement and Delivery')).toBeVisible();
        await page.getByRole('link', { name: /Wallboard/i }).click();
        await expect(page.getByRole('heading', { name: 'Department Wallboard' })).toBeVisible();
    });
});
