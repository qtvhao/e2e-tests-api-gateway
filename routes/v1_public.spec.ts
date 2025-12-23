import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway V1 Public Endpoints
 *
 * Tests cover:
 * - Public status endpoint (/api/v1/public/status)
 * - Health check endpoints
 */

test.describe('API Gateway V1 Public Endpoints', () => {
  test('GET /api/v1/public/status returns status', async ({ request }) => {
    const response = await request.get('/api/v1/public/status');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('health endpoint returns healthy status', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('health ready endpoint returns ready status', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();
  });

  test('health live endpoint returns live status', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();
  });
});
