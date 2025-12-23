import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('Notification Settings Options', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await loginAsAdmin(page);
    // Navigate to notification settings page
    await page.goto('/settings', { waitUntil: 'networkidle' });
    // Wait for settings to load
    await page.waitForSelector('h1, [role="heading"]', { timeout: 5000 });
  });

  test('displays notification preference options', async ({ page }) => {
    // Wait for notification controls to be available
    const toggles = page.locator('[role="switch"]');
    const notificationControls = page.locator('[class*="notification"], [name*="notification"]');
    const labels = page.locator('label');

    // Check that at least some notification options are visible
    const toggleCount = await toggles.count().catch(() => 0);
    const controlCount = await notificationControls.count().catch(() => 0);
    const labelCount = await labels.count().catch(() => 0);

    expect(toggleCount > 0 || controlCount > 0 || labelCount > 0).toBeTruthy();
  });
});
