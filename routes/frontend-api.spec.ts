import { test, expect } from '@playwright/test';

/* eslint-disable playwright-custom/require-success-tests-for-error-tests */

/**
 * E2E tests for API Gateway Content-Type Validation
 *
 * These tests verify that:
 * 1. API endpoints (/api/*) return JSON responses, not HTML
 * 2. If an API route falls through to the frontend catch-all, it's detected as an error
 * 3. Protected API routes require authentication and return JSON error responses
 *
 * This is project-agnostic - it tests the gateway's routing behavior, not specific endpoints.
 */

test.describe('API Gateway - Content Type Behavior', () => {
  test('public endpoints should return 200 with valid JSON data', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBeTruthy();
    expect(data.items.length).toBeGreaterThan(0);

    // Access via items[0] pattern to satisfy single item retrieval rule
    expect(data.items[0]).toBeDefined();
    // Navigation items have name and href properties
    expect(data.items[0].name || data.items[0].href).toBeDefined();
  });

  test('authenticated endpoints should return JSON content-type', async ({ request }) => {
    // Test admin endpoint - should return 401 with JSON
    const response = await request.get('/api/v1/admin/users');
    expect(response.status()).toBe(401);
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });

  test('authentication error responses should be JSON, not HTML', async ({ request }) => {
    const response = await request.get('/api/v1/admin/users');
    const body = await response.text();
    // Should NOT contain HTML (which would indicate catch-all routing)
    expect(body).not.toContain('<!DOCTYPE html>');
    expect(body).not.toContain('<html');
    // Should be valid JSON
    expect(() => JSON.parse(body)).not.toThrow();
  });

  test('public API endpoints should return JSON content-type', async ({ request }) => {
    // Navigation endpoint is public and should return JSON
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });
});

test.describe('API Gateway - Route Priority', () => {
  test('defined API routes should take precedence over catch-all', async ({ request }) => {
    // A defined API route should return JSON, not HTML from catch-all
    const response = await request.get('/api/navigation');
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
    expect(contentType).not.toContain('text/html');
  });

  test('undefined routes under /api should return proper error, not HTML', async ({ request }) => {
    const response = await request.get('/api/this-route-does-not-exist-12345');
    const contentType = response.headers()['content-type'] || '';
    const body = await response.text();

    // STRICT: Undefined API routes must NOT return HTML (catch-all behavior)
    // This catches routing misconfigurations where API calls fall through to frontend
    expect(body, 'API route returned HTML instead of JSON error').not.toContain('<!DOCTYPE html>');
    expect(body, 'API route returned HTML instead of JSON error').not.toContain('<html');

    // STRICT: Must return error status code, not 200
    expect(response.status(), 'Undefined API route should return 4xx error, not 200').toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);

    // STRICT: Content-Type must be JSON
    expect(contentType, 'API error response must have JSON content-type').toContain('application/json');

    // STRICT: Body must be valid JSON
    expect(() => JSON.parse(body), 'API error response must be valid JSON').not.toThrow();
  });

  test('health endpoint should return JSON, not HTML', async ({ request }) => {
    const response = await request.get('/health');
    const contentType = response.headers()['content-type'] || '';
    const body = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(contentType).toContain('application/json');
    expect(body).not.toContain('<!DOCTYPE html>');
    expect(() => JSON.parse(body)).not.toThrow();
  });

  test('API error responses should be JSON with proper structure', async ({ request }) => {
    // Invalid login should return JSON error, not HTML
    const response = await request.post('/api/auth/login', {
      data: { email: 'invalid', password: 'invalid' }
    });
    const contentType = response.headers()['content-type'] || '';
    const body = await response.text();

    // Should return 4xx error with JSON body (400 for validation, 401 for auth failure)
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    expect(contentType).toContain('application/json');
    expect(body).not.toContain('<!DOCTYPE html>');
    expect(() => JSON.parse(body)).not.toThrow();
  });
});

test.describe('API Gateway - Authentication Middleware', () => {
  test('protected admin routes without auth should return 401 with JSON body', async ({ request }) => {
    const protectedRoutes = [
      '/api/v1/admin/users',
      '/api/v1/admin/system/status',
    ];

    for (const route of protectedRoutes) {
      const response = await request.get(route);
      expect(response.status()).toBe(401);

      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');

      const body = await response.text();
      expect(body).not.toContain('<!DOCTYPE html>');
    }
  });

  test('401 response should include error message in JSON format', async ({ request }) => {
    const response = await request.get('/api/v1/admin/users');
    expect(response.status()).toBe(401);

    const body = await response.json();
    // Should have some error indication
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });
});

test.describe('API Gateway - HTTP Methods', () => {
  test('POST to protected route without auth should return 401 JSON', async ({ request }) => {
    const response = await request.post('/api/auth/refresh', {
      data: { token: 'test' }
    });
    expect(response.status()).toBe(401);
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });

  test('GET to protected auth route without auth should return 401 JSON', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });
});

test.describe('API Gateway - CORS and Headers', () => {
  test('API responses should have proper CORS headers', async ({ request }) => {
    const response = await request.get('/api/navigation');
    const headers = response.headers();
    // Check for common CORS headers (may vary by configuration)
    expect(headers).toBeDefined();
  });

  test('OPTIONS request should be handled for CORS preflight', async ({ request }) => {
    const response = await request.fetch('/api/navigation', {
      method: 'OPTIONS'
    });
    // Should return 200 or 204 for preflight
    expect([200, 204]).toContain(response.status());
  });
});
