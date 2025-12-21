import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Health Endpoints
 *
 * Tests cover:
 * - Health check endpoints (/health, /health/ready, /health/live)
 * - Public status endpoint (/api/v1/public/status)
 * - Admin endpoints requiring authentication
 * - Response format validation
 */
test.describe('API Gateway Health', () => {
  test.describe('Health Check Endpoints', () => {
    test('GET /health returns healthy status', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('api-gateway');
      expect(data.timestamp).toBeDefined();
    });

    test('GET /health/ready returns ready status', async ({ request }) => {
      const response = await request.get('/health/ready');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ready');
      expect(data.service).toBe('api-gateway');
      expect(data.timestamp).toBeDefined();
    });

    test('GET /health/live returns live status with uptime', async ({ request }) => {
      const response = await request.get('/health/live');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('live');
      expect(data.service).toBe('api-gateway');
      expect(data.uptime).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    test('health endpoints return valid RFC3339 timestamps', async ({ request }) => {
      const response = await request.get('/health');
      const data = await response.json();

      const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      expect(data.timestamp).toMatch(rfc3339Regex);
    });
  });

  test.describe('Public Status Endpoint', () => {
    test('GET /api/v1/public/status returns operational status', async ({ request }) => {
      const response = await request.get('/api/v1/public/status');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('operational');
      expect(data.service).toBe('api-gateway');
      expect(data.version).toBe('1.0.0');
      expect(data.uptime).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  test.describe('Admin Endpoints Authentication', () => {
    test('GET /api/v1/admin/users requires authentication', async ({ request }) => {
      const response = await request.get('/api/v1/admin/users');
      expect(response.status()).toBe(401);
    });

    test('GET /api/v1/admin/system/status requires authentication', async ({ request }) => {
      const response = await request.get('/api/v1/admin/system/status');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Response Headers', () => {
    test('health endpoint returns JSON content type', async ({ request }) => {
      const response = await request.get('/health');
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });
  });

  test.describe('Browser Tests', () => {
    test('application loads with valid title', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/.+/);
    });

    test('login page is accessible', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome to ugjb/i })).toBeVisible();
    });

    test('protected routes redirect to login when unauthenticated', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await page.goto('/employees');
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('/login');
    });
  });
});
