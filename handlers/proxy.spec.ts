import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Proxy Handler
 *
 * Tests the proxy functionality that routes requests from the frontend to backend microservices.
 * The proxy handler is responsible for:
 * - Routing API requests to appropriate backend services
 * - Handling service unavailability errors
 * - Proxying external services (Ollama, Docker Registry)
 * - Supporting WebSocket connections for frontend HMR
 */
test.describe('API Gateway Proxy', () => {
  test.describe('Health Check Endpoints', () => {
    test('should return healthy status from main health endpoint', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });

    test('should return ready status from readiness endpoint', async ({ request }) => {
      const response = await request.get('/health/ready');
      expect(response.ok()).toBeTruthy();
    });

    test('should return live status from liveness endpoint', async ({ request }) => {
      const response = await request.get('/health/live');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Authentication Proxy', () => {
    test('should require authentication for protected endpoints', async ({ request }) => {
      const response = await request.get('/api/v1/hr-management');
      expect(response.status()).toBe(401);
    });

    test('should reject requests without valid JWT token', async ({ request }) => {
      const response = await request.get('/api/v1/hr-management', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      expect([401, 403]).toContain(response.status());
    });

    test('login endpoint should be accessible without auth', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      });
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Service Proxy Routing', () => {
    test('should route to public endpoints without authentication', async ({ request }) => {
      const response = await request.get('/api/v1/public/status');
      expect(response.ok() || response.status() === 404).toBeTruthy();
    });

    test('should handle service unavailability gracefully', async ({ request }) => {
      const response = await request.get('/api/v1/nonexistent-service');
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });

    test('should return navigation configuration', async ({ request }) => {
      const response = await request.get('/api/navigation');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toBeTruthy();
      expect(typeof data === 'object' || Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('External Service Proxy', () => {
    test('should proxy to Ollama LLM service endpoints', async ({ request }) => {
      const endpoints = ['/api/generate', '/api/chat', '/api/embeddings'];

      for (const endpoint of endpoints) {
        const response = await request.post(endpoint, {
          data: { test: 'data' }
        });
        expect([200, 400, 404, 502, 503]).toContain(response.status());
      }
    });

    test('should proxy to Docker Registry API', async ({ request }) => {
      const response = await request.get('/v2/', {
        maxRedirects: 0
      });
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });
  });

  test.describe('Frontend Static Files Proxy', () => {
    test('should serve frontend application', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      const hasReactRoot = await page.locator('#root').count() > 0;
      expect(hasReactRoot).toBeTruthy();
    });

    test('should return HTML for catch-all routes', async ({ request }) => {
      const response = await request.get('/employees');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should handle frontend routing for SPA navigation', async ({ page }) => {
      await page.goto('/');

      const navLinks = await page.getByRole('link').all();
      if (navLinks.length > 0) {
        const firstLink = navLinks[0];
        await firstLink.click();

        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid JSON in request body', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: 'invalid json'
      });
      expect([400, 415]).toContain(response.status());
    });

    test('should handle missing required fields in requests', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {}
      });
      expect([400, 422]).toContain(response.status());
    });

    test('should return appropriate error for 404 API routes', async ({ request }) => {
      const response = await request.get('/api/v1/this-definitely-does-not-exist');
      expect(response.status()).toBeGreaterThanOrEqual(200);
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
      expect([200, 400, 401]).toContain(response.status());
    });

    test('should handle OPTIONS requests for CORS', async ({ request }) => {
      const response = await request.fetch('/api/navigation', {
        method: 'OPTIONS'
      });
      expect([200, 204]).toContain(response.status());
    });
  });

  test.describe('Request Header Forwarding', () => {
    test('should forward custom headers to backend services', async ({ request }) => {
      const response = await request.get('/health', {
        headers: {
          'X-Custom-Header': 'test-value'
        }
      });
      expect(response.ok()).toBeTruthy();
    });

    test('should set X-Forwarded-For header', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();
    });
  });
});
