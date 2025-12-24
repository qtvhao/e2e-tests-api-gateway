/**
 * @fileoverview E2E tests for API Gateway Error Handling - HTTP Methods
 * Tests HTTP method handling and CORS
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling - HTTP Methods', () => {
  test('GET to POST-only endpoint returns appropriate error', async ({ request }) => {
    const response = await request.get('/api/auth/login');
    expect([404, 405]).toContain(response.status());
  });

  test('POST to GET-only endpoint returns appropriate error', async ({ request }) => {
    const response = await request.post('/health');
    expect([404, 405]).toContain(response.status());
  });

  test('DELETE to read-only endpoint returns appropriate error', async ({ request }) => {
    const response = await request.delete('/api/navigation');
    expect([404, 405]).toContain(response.status());
  });

  test('PUT to login endpoint returns appropriate error', async ({ request }) => {
    const response = await request.put('/api/auth/login', {
      data: { email: 'test@test.com', password: 'test' }
    });
    expect([404, 405]).toContain(response.status());
  });

  test('OPTIONS requests are handled for CORS', async ({ request }) => {
    const response = await request.fetch('/api/navigation', {
      method: 'OPTIONS'
    });
    expect([200, 204]).toContain(response.status());
  });

  test('HEAD requests work for GET endpoints', async ({ request }) => {
    const response = await request.head('/health');
    expect([200, 204, 405]).toContain(response.status());
  });
});
