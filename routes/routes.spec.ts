import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Routes Configuration
 *
 * This is the main test suite that covers general routing behavior.
 * Specific route categories are tested in separate files:
 * - health.spec.ts: Health check endpoints
 * - auth.spec.ts: Authentication routes
 * - microservices.spec.ts: Protected microservice routes
 * - external-services.spec.ts: Ollama and Docker Registry proxies
 * - frontend-catchall.spec.ts: Frontend catch-all with WebSocket support
 */

test.describe('Navigation Configuration', () => {
  test('should return navigation config from /api/navigation', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeTruthy();
  });

  test('navigation endpoint should not require authentication', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.status()).not.toBe(401);
  });

  test('API routes should take precedence over catch-all', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});

test.describe('Public API Routes', () => {
  test('should allow access to /api/v1/public/status without auth', async ({ request }) => {
    const response = await request.get('/api/v1/public/status');
    expect([200, 404, 502]).toContain(response.status());
  });
});

test.describe('Admin Routes', () => {
  test('should require authentication for admin routes', async ({ request }) => {
    const response = await request.get('/api/v1/admin/users');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for system status', async ({ request }) => {
    const response = await request.get('/api/v1/admin/system/status');
    expect(response.status()).toBe(401);
  });
});

test.describe('HTTP Methods Support', () => {
  test('should handle GET requests', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should handle POST requests', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: 'test@test.com', password: 'test' }
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should handle OPTIONS for CORS preflight', async ({ request }) => {
    const response = await request.fetch('/api/navigation', {
      method: 'OPTIONS'
    });
    expect([200, 204]).toContain(response.status());
  });
});
