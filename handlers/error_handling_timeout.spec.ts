/**
 * @fileoverview E2E tests for API Gateway Error Handling - Timeout
 * Tests response time handling
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling - Timeout', () => {
  test('health endpoint responds within reasonable time', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/health', { timeout: 5000 });
    const endTime = Date.now();

    expect(response.ok()).toBeTruthy();
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('navigation endpoint responds within reasonable time', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/navigation', { timeout: 5000 });
    const endTime = Date.now();

    expect(response.ok()).toBeTruthy();
    expect(endTime - startTime).toBeLessThan(5000);
  });
});
