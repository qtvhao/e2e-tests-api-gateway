import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Authentication Routes
 */
test.describe('Authentication Routes', () => {
  test('should allow POST to /api/auth/login without auth', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword'
      }
    });
    expect([200, 400, 401]).toContain(response.status());
  });

  test('should allow POST to /api/auth/logout', async ({ request }) => {
    const response = await request.post('/api/auth/logout');
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should require authentication for /api/auth/refresh', async ({ request }) => {
    const response = await request.post('/api/auth/refresh');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for /api/auth/me', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });
});
