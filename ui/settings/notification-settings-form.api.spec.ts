/**
 * @fileoverview Notification Settings Form - API Tests - Form submission endpoints and response validation
 * @see web/app/src/pages/settings/NotificationSettings.tsx
 *
 * @version 1.0.0
 * @test-type api
 * @form-type settings
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Form submission and endpoint validation
 * - Field rendering and user interactions
 * - Input validation and error handling
 *
 * Related test files:
 * - notification-settings-form.spec.ts (INDEX - orchestrates all tests)
 * - notification-settings-form.api.spec.ts (API endpoints)
 * - notification-settings-form.ui.spec.ts (UI rendering)
 * - notification-settings-form.validation.spec.ts (Validation rules)
 *
 * Submit patterns detected: handleToggle
 *
 * See: auth_api.spec.ts, login-form.api.spec.ts
 *
 */
import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../../helpers/test-config';
import { TEST_USERS } from '../../../../web-app/helpers/test-users';
import { getAuthToken } from '../../helpers/auth';

test.describe('Notification Settings Form - API Tests', () => {
  const config = loadTestConfig();
  const API_BASE_URL = config.apiBaseUrl;
  const NOTIFICATIONS_ENDPOINT = `${API_BASE_URL}/api/v1/settings/notifications`;
  const AUTH_ENDPOINT = `${API_BASE_URL}/api/v1/auth/login`;
  const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;

  test('API: Health check endpoint is available', async ({ request }) => {
    const response = await request.get(HEALTH_ENDPOINT);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
  });

  test('API: GET notification settings requires authentication', async ({ request }) => {
    const response = await request.get(NOTIFICATIONS_ENDPOINT);
    // Expect 401 Unauthorized when no auth token is provided
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
  });

  test('API: GET notification settings returns valid response with auth', async ({ request }) => {
    // First, get auth token
    const authToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password);

    const response = await request.get(NOTIFICATIONS_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
  });

  test('API: GET notification settings returns expected data structure', async ({ request }) => {
    const authToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password);

    const response = await request.get(NOTIFICATIONS_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('preferences');
    expect(body.items).toBeDefined();
    expect(body.preferences).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(typeof body.preferences).toBe('object');
  });

  test('API: PUT notification settings requires authentication', async ({ request }) => {
    const response = await request.put(NOTIFICATIONS_ENDPOINT, {
      data: {
        preferences: { email: true, push: false }
      }
    });
    // Expect 401 Unauthorized when no auth token is provided
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
  });

  test('API: PUT notification settings accepts valid preferences', async ({ request }) => {
    const authToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password);

    const testPreferences = {
      email: true,
      push: false,
      assignments: true,
      skillUpdates: false
    };

    const response = await request.put(NOTIFICATIONS_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        preferences: testPreferences
      }
    });

    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
    expect(body).toHaveProperty('preferences');
  });

  test('API: PUT notification settings returns updated preferences', async ({ request }) => {
    const authToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password);

    const testPreferences = {
      email: false,
      push: true,
      assignments: false,
      skillUpdates: true
    };

    const response = await request.put(NOTIFICATIONS_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        preferences: testPreferences
      }
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');
    expect(body.preferences).toMatchObject(testPreferences);
  });

  test('API: Notification items have required fields', async ({ request }) => {
    const authToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password);

    const response = await request.get(NOTIFICATIONS_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.error?.message).not.toBe('API endpoint not found');

    // Each notification item should have key, label, and description
    for (const item of body.items) {
      expect(item).toHaveProperty('key');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('description');
      expect(typeof item.key).toBe('string');
      expect(typeof item.label).toBe('string');
      expect(typeof item.description).toBe('string');
    }
  });
});
