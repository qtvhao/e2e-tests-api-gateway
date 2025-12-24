/**
 * @fileoverview E2E tests for API Gateway Error Handling - Edge Cases
 * Tests edge cases and unusual request patterns
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling - Edge Cases', () => {
  test('handles path with trailing slash', async ({ request }) => {
    const response = await request.get('/health/');
    expect([200, 301, 308]).toContain(response.status());
  });

  test('handles path with double slashes', async ({ request }) => {
    const response = await request.get('/health//');
    expect([200, 301, 308]).toContain(response.status());
  });

  test('handles path with query parameters', async ({ request }) => {
    const response = await request.get('/health?foo=bar&baz=qux');
    expect(response.ok()).toBeTruthy();
  });

  test('handles path with encoded characters', async ({ request }) => {
    const response = await request.get('/api/navigation?filter=%20test%20');
    expect(response.ok()).toBeTruthy();
  });

  test('handles concurrent requests', async ({ request }) => {
    const requests = Array(5).fill(null).map(() => request.get('/health'));
    const responses = await Promise.all(requests);

    for (const response of responses) {
      expect(response.ok()).toBeTruthy();
    }
  });
});
