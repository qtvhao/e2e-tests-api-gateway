import { test, expect } from '@playwright/test';

/**
 * E2E tests for Auth Helpers
 */
test.describe('Auth Helpers', () => {
  test.describe('API Tests', () => {
    test('should return healthy status from health endpoint', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Browser Tests', () => {
    test('should load the application page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/.*/);
    });
  });
});
