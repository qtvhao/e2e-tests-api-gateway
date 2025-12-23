import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * E2E tests for API Gateway Navigation Endpoints
 */
test.describe('API Gateway Navigation', () => {
  test.describe('Navigation API', () => {
    test('GET /api/navigation returns navigation items', async ({ request }) => {
      const response = await request.get('/api/navigation');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBeTruthy();
    });

    test('navigation items have required fields', async ({ request }) => {
      const response = await request.get('/api/navigation');
      const data = await response.json();

      for (const item of data.items) {
        expect(item.name).toBeDefined();
        expect(item.href).toBeDefined();
        expect(item.icon).toBeDefined();
        expect(typeof item.name).toBe('string');
        expect(typeof item.href).toBe('string');
        expect(typeof item.icon).toBe('string');
      }
    });

    test('navigation includes expected items', async ({ request }) => {
      const response = await request.get('/api/navigation');
      const data = await response.json();
      const names = data.items.map((item: { name: string }) => item.name);

      // Check for common navigation items
      expect(names).toContain('Dashboard');
      expect(names).toContain('Settings');
    });

    test('navigation hrefs are valid paths', async ({ request }) => {
      const response = await request.get('/api/navigation');
      const data = await response.json();

      for (const item of data.items) {
        expect(item.href).toMatch(/^\//);
      }
    });

    test('navigation API is publicly accessible', async ({ request }) => {
      const response = await request.get('/api/navigation');
      expect(response.status()).toBe(200);
    });

    test('navigation endpoint returns JSON content type', async ({ request }) => {
      const response = await request.get('/api/navigation');
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });
  });

  test.describe('Sidebar Navigation UI', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await loginAsAdmin(page);
    });

    test('sidebar displays navigation links', async ({ page }) => {
      await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
    });

    test('can navigate to settings page', async ({ page }) => {
      await page.getByRole('link', { name: /settings/i }).click();
      await expect(page).toHaveURL(/\/settings/);
    });
  });

  test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await loginAsAdmin(page);
    });

    test('displays dashboard heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
    });

    test('dashboard page loads after login', async ({ page }) => {
      // Verify we're still on the dashboard by checking the page title and heading
      await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
      // Dashboard content should be visible even if API calls fail
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
