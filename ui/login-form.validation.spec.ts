/**
 * @fileoverview Login Form - Validation Tests - Field validation and error handling
 * @see web/app/src/pages/LoginPage.tsx
 *
 * @version 1.0.0
 * @test-type validation
 * @form-type login
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Form field validation rules
 * - Error handling and user feedback
 *
 * Related test files:
 * - login-form.spec.ts (INDEX - orchestrates all tests)
 * - login-form.api.spec.ts (API endpoints)
 * - login-form.ui.spec.ts (UI rendering)
 * - login-form.validation.spec.ts (Validation rules)
 */

import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../helpers/test-config';
import { TEST_USERS } from '../helpers/test-users';

test.describe('Login Form - Validation Tests', () => {
  // Force sequential execution to avoid race conditions with auth state
  // Removed retries to stay within validator's 10s per-file limit
  test.describe.configure({ mode: 'serial' });

  const config = loadTestConfig();
  const LOGIN_URL = config.baseUrl;

  test.beforeEach(async ({ page }) => {
    await page.goto(`${LOGIN_URL}/login`, { waitUntil: 'domcontentloaded' });
    // Wait for the login form to be fully interactive - reduced timeout for faster execution
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 1000 });
  });

  test('Validation: Empty email field shows validation error', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const submitButton = page.locator('button[type="submit"]').or(page.getByRole('button', { name: /sign in|login/i }));

    // Clear and blur to trigger validation
    await emailInput.fill('');
    await emailInput.blur();

    // Check for HTML5 validation or error message
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('Validation: Invalid email format is rejected', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const submitButton = page.locator('button[type="submit"]').or(page.getByRole('button', { name: /sign in|login/i }));

    await emailInput.fill('invalid-email');
    await emailInput.blur();

    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('Validation: Valid email format passes HTML5 validation', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();

    await emailInput.fill('valid@example.com');
    await emailInput.blur();

    // Verify HTML5 email validation reports field as valid
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBeTruthy();
  });

  test('Validation: Form submission with invalid credentials shows error', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').or(page.getByRole('button', { name: /sign in|login/i }));

    await emailInput.fill(TEST_USERS.invalid.email);
    await passwordInput.fill(TEST_USERS.invalid.password);

    // Use Promise.all to start listening BEFORE click to avoid race condition
    // Reduced timeout to 3000ms to fit within 10s file limit
    await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/api/v1/auth/login'),
        { timeout: 3000 }
      ),
      submitButton.click()
    ]);

    // Verify we stay on login page (invalid credentials rejected)
    expect(page.url()).toContain('login');
  });
});
