/**
 * @fileoverview Login Form - UI Tests - Form field rendering and user interactions
 * @see web/app/src/pages/LoginPage.tsx
 *
 * Tests for LoginPage component form submission
 *
 * @version 1.0.0
 * @test-type ui
 * @form-type login
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Login page rendering and form visibility
 * - Field interaction and form submission
 *
 * Related test files:
 * - login-form.spec.ts (INDEX - orchestrates all tests)
 * - login-form.api.spec.ts (API endpoints)
 * - login-form.ui.spec.ts (UI rendering)
 * - login-form.validation.spec.ts (Validation rules)
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../helpers/test-users';
import { verifyNoErrorBoundary } from '../helpers/ui-test-utils';

// Tests for LoginPage component form submission
test.describe('Login Form - UI Tests', () => {
  // Force sequential execution to avoid race conditions with auth state
  test.describe.configure({ mode: 'serial' });

  test('UI: Login page displays form and handles submission', async ({ page }) => {
    // Navigate to login page with faster wait strategy
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Wait for form to be rendered with retry for stability
    await expect(async () => {
      const formVisible = await page.locator('form, [role="form"]').first().isVisible();
      expect(formVisible).toBe(true);
    }).toPass({ timeout: 10000 });

    // Verify no error boundary
    await verifyNoErrorBoundary(page);

    // Verify form elements are visible using appropriate selectors
    // Email input uses textbox role, password input uses getByLabel since password type doesn't have textbox role
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Wait for form elements to be visible with explicit timeouts
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeEnabled();

    // Fill in credentials with small delays for stability
    await emailInput.click();
    await emailInput.fill(TEST_USERS.admin.email);
    await passwordInput.click();
    await passwordInput.fill(TEST_USERS.admin.password);

    // Verify values are filled
    await expect(emailInput).toHaveValue(TEST_USERS.admin.email);
    await expect(passwordInput).toHaveValue(TEST_USERS.admin.password);

    // Wait for login API response before clicking
    const loginResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
      { timeout: 15000 }
    );

    // Submit form
    await submitButton.click();

    // Wait for API response to complete
    await loginResponsePromise;

    // Wait for successful navigation to dashboard with retry for stability
    await expect(async () => {
      const url = page.url();
      expect(url.endsWith('/') || url.includes('dashboard')).toBe(true);
    }).toPass({ timeout: 15000 });

    // Wait for main content area to be visible first (ensures layout is rendered)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10000 });

    // Verify successfully navigated to dashboard with explicit timeout
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});
