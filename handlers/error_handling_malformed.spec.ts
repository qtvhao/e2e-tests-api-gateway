/**
 * @fileoverview E2E tests for API Gateway Error Handling - Malformed Requests
 * Tests handling of invalid, malformed, or malicious requests
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling - Malformed Requests', () => {
  test('handles request with invalid JSON body', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: 'invalid-json-{{'
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('handles request with empty body', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {}
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('handles request with null values', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: null, password: null }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('handles request with very long strings', async ({ request }) => {
    const longString = 'a'.repeat(10000);
    const response = await request.post('/api/auth/login', {
      data: { email: longString, password: longString }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('handles request with special characters', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: '<script>alert("xss")</script>@test.com',
        password: '"; DROP TABLE users; --'
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
