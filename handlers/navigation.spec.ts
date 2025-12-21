import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for API Gateway Navigation Endpoints
 *
 * Tests cover:
 * - Navigation API endpoint (/api/navigation)
 * - Navigation items structure validation
 * - Sidebar navigation UI (authenticated)
 * - Navigation links functionality
 */

interface SeedUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: string[];
}

interface SeedData {
  users: SeedUser[];
}

// Load test users from seed.json
const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const testUser = seedData.users[0];

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

      expect(names).toContain('Dashboard');
      expect(names).toContain('Employees');
      expect(names).toContain('Skills');
      expect(names).toContain('Assignments');
      expect(names).toContain('Projects');
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
      // Clear storage and login
      await page.context().clearCookies();
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());

      // Login with test user
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    });

    test('sidebar displays navigation links', async ({ page }) => {
      await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /employees/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /skills/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
    });

    test('can navigate to employees page', async ({ page }) => {
      await page.getByRole('link', { name: /employees/i }).click();
      await expect(page).toHaveURL(/\/employees/);
    });

    test('can navigate to skills page', async ({ page }) => {
      await page.getByRole('link', { name: /skills/i }).click();
      await expect(page).toHaveURL(/\/skills/);
    });

    test('can navigate to settings page', async ({ page }) => {
      await page.getByRole('link', { name: /settings/i }).click();
      await expect(page).toHaveURL(/\/settings/);
    });
  });

  test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    });

    test('displays dashboard heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
    });

    test('displays FTE distribution section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /fte distribution/i })).toBeVisible();
    });

    test('displays recent activity section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /recent activity/i })).toBeVisible();
    });
  });
});
