/**
 * @fileoverview Appearance Settings Form - UI Tests - Theme selection rendering and user interactions
 * @see web/app/src/pages/settings/AppearanceSettings.tsx
 *
 * @version 1.0.0
 * @test-type ui
 * @form-type settings
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Theme button rendering
 * - Theme selection interactions
 *
 * Related test files:
 * - appearance-settings-form.spec.ts (INDEX - orchestrates all tests)
 * - appearance-settings-form.api.spec.ts (API endpoints)
 * - appearance-settings-form.ui.spec.ts (UI rendering)
 * - appearance-settings-form.validation.spec.ts (Validation rules)
 *
 * Tests for AppearanceSettings component theme selection
 */
import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../helpers/test-config';
import { loginAsAdmin } from '../../system-integration/api-gateway/helpers/auth';

test.describe('Appearance Settings Form - UI Tests', () => {
  const config = loadTestConfig();

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });
  });

  test('UI: Settings page renders with Appearance section', async ({ page }) => {
    // Check that we're on the settings page
    await expect(page).toHaveURL(/\/settings/);

    // Appearance heading should be visible
    const appearanceHeading = page.getByRole('heading', { name: /appearance/i });
    await expect(appearanceHeading).toBeVisible();
  });

  test('UI: Theme selection buttons are visible', async ({ page }) => {
    // Look for theme selection buttons
    const lightButton = page.getByRole('button', { name: /light/i });
    const darkButton = page.getByRole('button', { name: /dark/i });
    const systemButton = page.getByRole('button', { name: /system/i });

    // At least one theme button should be visible
    await expect(lightButton.or(darkButton).or(systemButton).first()).toBeVisible();
  });

  test('UI: Theme button can be clicked', async ({ page }) => {
    // Find theme buttons
    const darkButton = page.getByRole('button', { name: /dark/i });

    // Click the dark theme button
    await darkButton.click();

    // The button should still be visible after click
    await expect(darkButton).toBeVisible();
  });

  test('UI: Multiple theme options available', async ({ page }) => {
    // Find buttons containing theme-related text
    const themeButtons = page.locator('button').filter({ hasText: /light|dark|system/i });

    // Verify at least 2 theme options exist
    await expect(themeButtons).toHaveCount(3);
  });
});
