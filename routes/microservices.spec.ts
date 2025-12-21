import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Protected Microservice Routes
 */
test.describe('Protected Microservice Routes', () => {
  test('should require authentication for engineering-analytics service', async ({ request }) => {
    const response = await request.get('/api/v1/engineering-analytics');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for goal-management service', async ({ request }) => {
    const response = await request.get('/api/v1/goal-management');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for hr-management service', async ({ request }) => {
    const response = await request.get('/api/v1/hr-management');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for project-management service', async ({ request }) => {
    const response = await request.get('/api/v1/project-management');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for system-integration service', async ({ request }) => {
    const response = await request.get('/api/v1/system-integration');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for workforce-wellbeing service', async ({ request }) => {
    const response = await request.get('/api/v1/workforce-wellbeing');
    expect(response.status()).toBe(401);
  });
});
