import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Frontend Catch-All Route (WebSocket Support)
 * Frontend routes are tested dynamically - the catch-all should serve HTML for any non-API route
 */
test.describe('Frontend Catch-All Route', () => {
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

  test('frontend catch-all should handle unknown routes', async ({ request }) => {
    const response = await request.get('/some-random-frontend-route');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });
});
