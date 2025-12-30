/**
 * @fileoverview Appearance Settings Form - API Tests - Form submission endpoints and response validation
 * @see web/app/src/pages/settings/AppearanceSettings.tsx
 *
 * @version 1.0.0
 * @test-type api
 * @form-type settings
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Note: AppearanceSettings uses localStorage for theme persistence, not an API endpoint.
 * This file contains health check and infrastructure validation tests.
 *
 * Related test files:
 * - appearance-settings-form.spec.ts (INDEX - orchestrates all tests)
 * - appearance-settings-form.api.spec.ts (API endpoints)
 * - appearance-settings-form.ui.spec.ts (UI rendering)
 * - appearance-settings-form.validation.spec.ts (Validation rules)
 */
import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../helpers/test-config';

test.describe('Appearance Settings Form - API Tests', () => {
  const config = loadTestConfig();

  test('API: Health check endpoint is available', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
    expect(body.status).toBeDefined();
    expect(body.status).toBe('healthy');
  });

  test('API: Navigation endpoint returns settings route', async ({ request }) => {
    const response = await request.get('/api/v1/navigation');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
    expect(body).toHaveProperty('items');
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThanOrEqual(1);

    // Verify settings route is in navigation
    const settingsItem = body.items.find((item: { href: string }) => item.href === '/settings');
    expect(settingsItem).toBeDefined();
  });
});
