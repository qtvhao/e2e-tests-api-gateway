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
  test('UI: Login page displays form and handles submission', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Verify no error boundary
    await verifyNoErrorBoundary(page);

    // Verify form elements are visible using role-based selectors
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    const submitButton = page.getByRole('button', { name: /sign in/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Fill in credentials
    await emailInput.fill(TEST_USERS.admin.email);
    await passwordInput.fill(TEST_USERS.admin.password);

    // Verify values are filled
    await expect(emailInput).toHaveValue(TEST_USERS.admin.email);
    await expect(passwordInput).toHaveValue(TEST_USERS.admin.password);

    // Submit form and wait for navigation
    await submitButton.click();

    // Wait for successful navigation to dashboard (login should succeed with valid credentials)
    await expect(page).toHaveURL('/');

    // Verify successfully navigated to dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
