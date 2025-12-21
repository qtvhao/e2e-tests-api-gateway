import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway and Main Application
 *
 * This test suite validates:
 * - Health check endpoints (no authentication)
 * - Authentication flow (login/logout)
 * - Navigation configuration endpoint
 * - Protected route behavior
 */

test.describe('API Gateway Health Endpoints', () => {
  test('should return healthy status from /health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should return ready status from /health/ready endpoint', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();
  });

  test('should return live status from /health/live endpoint', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Navigation API', () => {
  test('should return navigation items from /api/navigation', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
  });
});

test.describe('Authentication Flow', () => {
  test('should require authentication for protected API endpoints', async ({ request }) => {
    const response = await request.get('/api/v1/hr-management');
    expect(response.status()).toBe(401);
  });

  test('should redirect to login page when accessing protected routes without auth', async ({ page }) => {
    await page.goto('/');
    // Should be redirected to login page
    await expect(page.getByRole('heading', { name: /welcome to ugjb/i })).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist');
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
