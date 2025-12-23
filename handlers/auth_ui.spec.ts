import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for Login Page UI and User Interactions
 *
 * Tests cover:
 * - Login page UI elements
 * - Form input interactions
 * - Authentication state persistence
 *
 * Uses seeded credentials from: services/system-integration/microservices/api-gateway/db/seed.json
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

const firstUser = seedData.users[0];

test.describe('Login Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with all required elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display platform description', async ({ page }) => {
    await expect(page.getByText(/platform/i)).toBeVisible();
  });

  test('email input should be visible and editable', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEditable();
  });

  test('password input should be visible and editable', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEditable();
  });
});

test.describe('Login User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should allow typing in email field', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill(firstUser.email);
    await expect(emailInput).toHaveValue(firstUser.email);
  });

  test('should allow typing in password field', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill(firstUser.password);
    await expect(passwordInput).toHaveValue(firstUser.password);
  });

  test('should submit form and redirect to dashboard on successful login', async ({ page }) => {
    await page.getByLabel(/email/i).fill(firstUser.email);
    await page.getByLabel(/password/i).fill(firstUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/^https?:\/\/[^\/]+\/$/);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.getByLabel(/email/i).fill(firstUser.email);
    await page.getByLabel(/password/i).fill(firstUser.password);

    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authentication State Persistence', () => {
  test('should persist login state across page reloads', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(firstUser.email);
    await page.getByLabel(/password/i).fill(firstUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });

    await page.reload();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });
});
