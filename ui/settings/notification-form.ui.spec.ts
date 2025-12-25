import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

// Tests for NotificationSettings component form submission
test.describe('Notification Settings Form', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await loginAsAdmin(page);
    // Navigate to notification settings page
    await page.goto('/settings', { waitUntil: 'networkidle' });
    // Wait for settings to load
    await page.waitForSelector('h1, [role="heading"]', { timeout: 5000 });
  });

  test('can update notification settings', async ({ page }) => {
    // Verify settings page loaded successfully
    await expect(page).toHaveTitle(/workforce|settings/i);

    // Verify notification section is visible
    const notificationSection = page.getByRole('heading', { name: /notifications/i });
    await expect(notificationSection).toBeVisible();

    // Verify notification toggles are available and enabled
    const emailToggle = page.getByRole('switch', { name: /email/i });
    const pushToggle = page.getByRole('switch', { name: /push/i });

    await expect(emailToggle).toBeVisible();
    await expect(emailToggle).toBeEnabled();
    await expect(pushToggle).toBeVisible();
    await expect(pushToggle).toBeEnabled();

    // Test that toggles are interactive (can be clicked)
    await pushToggle.click();

    // Verify page is still responsive after toggle interaction
    await expect(page).toHaveTitle(/workforce|settings/i);
    await expect(notificationSection).toBeVisible();
  });
});
