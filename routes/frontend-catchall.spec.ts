import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Frontend Catch-All Route (WebSocket Support)
 */
test.describe('Frontend Catch-All Route', () => {
  test('should serve frontend for root path', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const hasReactRoot = await page.locator('#root').count() > 0;
    expect(hasReactRoot).toBeTruthy();
  });

  test('should serve frontend for /employees', async ({ request }) => {
    const response = await request.get('/employees');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('should serve frontend for /skills', async ({ request }) => {
    const response = await request.get('/skills');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('should serve frontend for /projects', async ({ request }) => {
    const response = await request.get('/projects');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('should serve frontend for /assignments', async ({ request }) => {
    const response = await request.get('/assignments');
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
