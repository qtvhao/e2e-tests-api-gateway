import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Proxy - Health Check Endpoints
 *
 * Tests the health check functionality of the API Gateway.
 */

test.describe('API Gateway Proxy - Health Check Endpoints', () => {
  test('should return healthy status from main health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
  });

  test('should return ready status from readiness endpoint', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('should return live status from liveness endpoint', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});
