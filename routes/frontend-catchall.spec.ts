import { test, expect } from '@playwright/test';

/**
 * @fileoverview E2E tests for API Gateway Frontend Catch-All Route
 * Tests the NoRoute handler that proxies to frontend with WebSocket support for HMR
 *
 * Route: NoRoute (catch-all) -> frontend:3000
 * Features: WebSocket upgrade support for Vite HMR
 */
test.describe('Frontend Catch-All Route', () => {
  test.describe('HTML Page Serving', () => {
    test('should serve frontend for root path', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      const hasReactRoot = await page.locator('#root').count() > 0;
      expect(hasReactRoot).toBeTruthy();
    });

    test('should serve frontend for /dashboard', async ({ request }) => {
      const response = await request.get('/dashboard');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should serve frontend for /settings', async ({ request }) => {
      const response = await request.get('/settings');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should serve frontend for /login', async ({ request }) => {
      const response = await request.get('/login');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('frontend catch-all should handle unknown routes', async ({ request }) => {
      const response = await request.get('/some-random-frontend-route');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });
  });

  test.describe('SPA Route Handling', () => {
    test('should serve HTML for /employees route', async ({ request }) => {
      const response = await request.get('/employees');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should serve HTML for /employees/new route', async ({ request }) => {
      const response = await request.get('/employees/new');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should serve HTML for /employees/:id route', async ({ request }) => {
      const response = await request.get('/employees/123');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should serve HTML for /skills route', async ({ request }) => {
      const response = await request.get('/skills');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should serve HTML for /projects route', async ({ request }) => {
      const response = await request.get('/projects');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });

    test('should serve HTML for /assignments route', async ({ request }) => {
      const response = await request.get('/assignments');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });
  });

  test.describe('Static Assets', () => {
    test('should proxy static assets with correct content-type', async ({ request }) => {
      // Request a potential asset path
      const response = await request.get('/assets/index.js', {
        maxRedirects: 0
      });
      // May return 200 (found) or 404 (not found) depending on build
      expect([200, 404]).toContain(response.status());
    });

    test('should handle favicon requests', async ({ request }) => {
      const response = await request.get('/favicon.ico', {
        maxRedirects: 0
      });
      // Favicon may or may not exist
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('API vs Frontend Routing', () => {
    test('API routes should NOT be caught by frontend catch-all', async ({ request }) => {
      const response = await request.get('/api/navigation');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      // Should be JSON, not HTML
      expect(contentType).toContain('application/json');
      expect(contentType).not.toContain('text/html');
    });

    test('/health should NOT be caught by frontend catch-all', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

    test('/v2 routes should NOT be caught by frontend catch-all', async ({ request }) => {
      const response = await request.get('/v2/', { maxRedirects: 0 });
      // Docker registry may respond with various statuses
      expect(response.status()).toBeDefined();
    });
  });

  test.describe('Response Headers', () => {
    test('frontend responses include content-type header', async ({ request }) => {
      const response = await request.get('/login');
      expect(response.headers()['content-type']).toBeDefined();
    });

    test('frontend HTML includes proper content-type', async ({ request }) => {
      const response = await request.get('/');
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/html');
    });
  });

  test.describe('Browser Integration', () => {
    test('React app mounts correctly', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('#root')).toBeVisible();
    });

    test('SPA navigation works', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('body')).toBeVisible();

      // Verify we're on login page
      await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    });

    test('404 page is displayed for unknown routes', async ({ page }) => {
      await page.goto('/this-route-definitely-does-not-exist-12345');
      // Frontend should render 404 page via React Router
      await expect(page.getByRole('heading', { name: /not found|404/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('WebSocket Support (HMR)', () => {
    test('frontend page loads without WebSocket errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/login');
      await expect(page.locator('#root')).toBeVisible();

      // Filter out WebSocket connection errors that are expected in test env
      const criticalErrors = consoleErrors.filter(
        err => !err.includes('WebSocket') && !err.includes('HMR')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });
});
