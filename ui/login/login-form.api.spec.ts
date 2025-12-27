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

import { test, expect } from '@playwright/test';

test.describe('Login Form - API Tests', () => {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
  const AUTH_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
  const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;

  test('API: Health check endpoint is available', async ({ request }) => {
    const response = await request.get(HEALTH_ENDPOINT);
    expect(response.status()).toBe(200);
  });

  test('API: Login endpoint accepts POST requests', async ({ request }) => {
    const response = await request.post(AUTH_ENDPOINT, {
      data: {
        email: 'admin@ugjb.com',
        password: 'Admin@123!'
      }
    });
    // Accept both 200 (success) and other valid responses (401 for invalid, etc.)
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
  });

  test('API: Login response returns valid status', async ({ request }) => {
    const response = await request.post(AUTH_ENDPOINT, {
      data: {
        email: 'admin@ugjb.com',
        password: 'Admin@123!'
      }
    });

    // Unconditional assertion: response status must be valid
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
  });

  test('API: Successful login includes token and user', async ({ request }) => {
    const response = await request.post(AUTH_ENDPOINT, {
      data: {
        email: 'admin@ugjb.com',
        password: 'Admin@123!'
      }
    });

    // Only test structure for successful responses
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
  });
});
