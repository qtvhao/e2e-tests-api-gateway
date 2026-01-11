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
import { verifyNoErrorBoundary, verifyNoEmptyState } from '../helpers/ui-test-utils';

// Tests for LoginPage component form submission
test.describe('Login Form - UI Tests', () => {
  // Force sequential execution to avoid race conditions with auth state
  // Add retries for flaky network timing issues
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('UI: Login page displays form and handles submission', async ({ page }) => {
    // Navigate to login page with faster wait strategy
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Verify no error boundary
    await verifyNoErrorBoundary(page);
    await verifyNoEmptyState(page);

    // Wait for form to be visible - single check instead of separate checks
    const form = page.locator('form, [role="form"]').first();
    await expect(form).toBeVisible({ timeout: 2000 });

    // Verify form elements are visible using appropriate selectors
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // Wait for form elements to be visible with minimal timeouts
    await expect(emailInput).toBeVisible({ timeout: 1500 });
    await expect(passwordInput).toBeVisible({ timeout: 1500 });
    await expect(submitButton).toBeVisible({ timeout: 1500 });

    // Fill in credentials directly (no clicks needed before fill)
    await emailInput.fill(TEST_USERS.admin.email);
    await passwordInput.fill(TEST_USERS.admin.password);

    // Setup response promise before clicking
    const loginResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
      { timeout: 2000 }
    );

    // Submit form
    await submitButton.click();

    // Wait for API response
    await loginResponsePromise;

    // Verify dashboard heading is visible - this confirms successful login and navigation
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 2000 });
  });
});
