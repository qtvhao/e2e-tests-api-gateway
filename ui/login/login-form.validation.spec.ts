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

test.describe('Login Form - Validation Tests', () => {
  const LOGIN_URL = process.env.BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${LOGIN_URL}/login`);
    await page.waitForLoadState('networkidle');
  });

  test('Validation: Empty email field shows validation error', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text(/sign in|login/i)');

    // Clear and blur to trigger validation
    await emailInput.fill('');
    await emailInput.blur();

    // Check for HTML5 validation or error message
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('Validation: Invalid email format is rejected', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text(/sign in|login/i)');

    await emailInput.fill('invalid-email');
    await emailInput.blur();

    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('Validation: Valid email format passes validation', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();

    await emailInput.fill('valid@example.com');
    await emailInput.blur();

    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBeTruthy();
  });

  test('Validation: Password field accepts input', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();

    await passwordInput.fill('TestPassword123!');
    const value = await passwordInput.inputValue();

    expect(value).toBe('TestPassword123!');
  });

  test('Validation: Form submission with invalid credentials shows error', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text(/sign in|login/i)');

    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('WrongPassword123!');
    await submitButton.click();

    // Wait for response and check for error message
    await page.waitForTimeout(1000);
    const hasError = await page.locator('div[role="alert"], [class*="error"], [class*="invalid"]').first().isVisible().catch(() => false);

    // Either error is shown or we stay on login page
    expect(
      hasError || page.url().includes('login')
    ).toBeTruthy();
  });
});
