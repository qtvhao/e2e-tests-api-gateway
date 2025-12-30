/**
 * @fileoverview Login Form - API Tests - Form submission endpoints and response validation
 * @see web/app/src/pages/LoginPage.tsx
 *
 * @version 1.0.0
 * @test-type api
 * @form-type login
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Login endpoint health and availability
 * - Authentication API response validation
 *
 * Related test files:
 * - login-form.spec.ts (INDEX - orchestrates all tests)
 * - login-form.api.spec.ts (API endpoints)
 * - login-form.ui.spec.ts (UI rendering)
 * - login-form.validation.spec.ts (Validation rules)
 */

import { test, expect, TEST_USERS } from '../fixtures/api-fixtures';
import { loadTestConfig } from '../helpers/test-config';
import { expectValidApiResponse, expectSuccessResponse } from '../helpers/api-test-utils';

test.describe('Login Form - API Tests', () => {
  const config = loadTestConfig();
  const API_BASE_URL = config.apiBaseUrl;
  const AUTH_ENDPOINT = `${API_BASE_URL}/api/v1/auth/login`;
  const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;

  test('API: Health check endpoint is available', async ({ request }) => {
    const response = await request.get(HEALTH_ENDPOINT);
    expect(response.status()).toBe(200);
    await expectValidApiResponse(response);
  });

  test('API: Login endpoint accepts POST requests', async ({ request }) => {
    const response = await request.post(AUTH_ENDPOINT, {
      data: TEST_USERS.admin
    });
    // Expect successful login with valid credentials
    await expectSuccessResponse(response);
  });

  test('API: Login response returns valid status', async ({ request }) => {
    const response = await request.post(AUTH_ENDPOINT, {
      data: TEST_USERS.admin
    });

    // Expect successful authentication with valid credentials
    expect(response.status()).toBe(200);
    await expectValidApiResponse(response);
  });

  test('API: Successful login includes token and user', async ({ request }) => {
    const response = await request.post(AUTH_ENDPOINT, {
      data: TEST_USERS.admin
    });

    // Only test structure for successful responses
    const body = await expectSuccessResponse(response);
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
  });
});
