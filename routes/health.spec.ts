import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Health Check Endpoints
 */
test.describe('Health Check Endpoints', () => {
  test('should return healthy status from /health', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should return ready status from /health/ready', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();
  });

  test('should return live status from /health/live', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();
  });

  test('health routes should take precedence over catch-all', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});
