import { test, expect } from '@playwright/test';

/**
 * @fileoverview Proxy E2E Tests - Error Handling
 * @see services/system-integration/microservices/api-gateway/handlers/proxy.go
 *
 * Tests the proxy handler behavior for undefined API routes.
 * The API Gateway returns JSON 404 responses for undefined /api/* routes
 * instead of proxying them to the frontend.
 *
 * @browsers chromium, api (ONLY - no firefox/webkit)
 */

test.describe('Proxy Handler - Undefined API Routes', () => {
  test('returns 404 JSON response for undefined API endpoint', async ({ request }) => {
    const response = await request.get('/api/undefined-endpoint');

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('API endpoint not found');
    expect(body.error.path).toBe('/api/undefined-endpoint');
  });

  test('returns 404 for nested undefined API path', async ({ request }) => {
    const response = await request.get('/api/v1/some/nested/undefined/path');

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('API endpoint not found');
    expect(body.error.path).toBe('/api/v1/some/nested/undefined/path');
  });

  test('returns 404 for POST to undefined API endpoint', async ({ request }) => {
    const response = await request.post('/api/non-existent-resource', {
      data: { test: 'data' },
    });

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('API endpoint not found');
  });

  test('returns 404 for PUT to undefined API endpoint', async ({ request }) => {
    const response = await request.put('/api/unknown/123', {
      data: { update: 'value' },
    });

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('API endpoint not found');
  });

  test('returns 404 for DELETE to undefined API endpoint', async ({ request }) => {
    const response = await request.delete('/api/missing-resource/456');

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('API endpoint not found');
  });

  test('includes correct path in error response', async ({ request }) => {
    const testPath = '/api/test/specific/path/with/segments';
    const response = await request.get(testPath);

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error.path).toBe(testPath);
  });

  test('returns JSON content-type for 404 API errors', async ({ request }) => {
    const response = await request.get('/api/check-content-type');

    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
