import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for API Gateway V1 Dashboard Integration
 *
 * Note: This file has been split into multiple smaller files:
 * - v1_public.spec.ts - Public endpoint tests
 * - v1_auth.spec.ts - Authentication tests
 * - v1_admin.spec.ts - Admin route tests
 * - v1_proxy.spec.ts - Service proxy tests
 *
 * This file contains dashboard integration tests that require browser context.
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

const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const adminUser = seedData.users.find(u => u.roles.includes('admin')) || seedData.users[0];

test.describe('API Gateway V1 Dashboard Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.getByLabel(/email/i).fill(adminUser.email);
    await page.getByLabel(/password/i).fill(adminUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('dashboard page loads after login', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
  });

  test('dashboard shows stats or error state', async ({ page }) => {
    const statsCards = page.locator('[class*="card"], [class*="Card"]').first();
    const errorState = page.getByText(/error|failed/i);
    await expect(statsCards.or(errorState)).toBeVisible({ timeout: 10000 });
  });
});
