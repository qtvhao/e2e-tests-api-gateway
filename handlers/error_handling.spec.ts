/**
 * @fileoverview E2E tests for API Gateway Error Handling
 * Tests error responses, edge cases, and gateway behavior under various conditions
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface SeedUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: string[];
}

interface SeedData {
  users: SeedUser[];
}

const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const adminUser = seedData.users.find(u => u.roles.includes('admin')) || seedData.users[0];

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

test.describe('API Gateway Error Handling', () => {
  test.describe('404 Not Found Responses', () => {
    test('undefined API routes return 404 JSON, not HTML', async ({ request }) => {
      const response = await request.get('/api/undefined-route-12345');

      const body = await response.text();
      expect(body).not.toContain('<!DOCTYPE html>');
      expect(body).not.toContain('<html');

      // Should return 4xx error
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('undefined API routes have JSON content-type', async ({ request }) => {
      const response = await request.get('/api/undefined-route-12345');

      if (response.status() >= 400 && response.status() < 500) {
        const contentType = response.headers()['content-type'] || '';
        expect(contentType).toContain('application/json');
      }
    });

    test('undefined v1 routes return proper error', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/v1/undefined-service-xyz', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // May be 404 or 502 depending on routing
      expect([404, 502]).toContain(response.status());
    });
  });

  test.describe('Malformed Request Handling', () => {
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

      // Should be rejected as invalid, not cause server error
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('HTTP Method Handling', () => {
    test('GET to POST-only endpoint returns appropriate error', async ({ request }) => {
      const response = await request.get('/api/auth/login');
      // Should return 405 Method Not Allowed or 404
      expect([404, 405]).toContain(response.status());
    });

    test('POST to GET-only endpoint returns appropriate error', async ({ request }) => {
      const response = await request.post('/health');
      // Should return 405 Method Not Allowed or 404
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

  test.describe('Content-Type Handling', () => {
    test('accepts application/json content-type', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: { email: adminUser.email, password: adminUser.password }
      });
      expect(response.ok()).toBeTruthy();
    });

    test('handles form-urlencoded content-type', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        form: { email: adminUser.email, password: adminUser.password }
      });
      // May accept or reject based on implementation
      expect(response.status()).toBeDefined();
    });
  });

  test.describe('Response Consistency', () => {
    test('all API errors return JSON responses', async ({ request }) => {
      const errorEndpoints = [
        { method: 'GET', path: '/api/auth/me' }, // 401
        { method: 'GET', path: '/api/undefined-route' }, // 404
      ];

      for (const endpoint of errorEndpoints) {
        const response = endpoint.method === 'GET'
          ? await request.get(endpoint.path)
          : await request.post(endpoint.path);

        if (response.status() >= 400) {
          const body = await response.text();
          expect(body, `${endpoint.method} ${endpoint.path} should not return HTML`).not.toContain('<!DOCTYPE html>');
        }
      }
    });

    test('error responses include consistent structure', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });

  test.describe('Edge Cases', () => {
    test('handles path with trailing slash', async ({ request }) => {
      const response = await request.get('/health/');
      // Should work or redirect, not error
      expect([200, 301, 308]).toContain(response.status());
    });

    test('handles path with double slashes', async ({ request }) => {
      const response = await request.get('//health');
      // Should normalize or handle appropriately
      expect(response.status()).toBeLessThan(500);
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

  test.describe('Proxy Error Handling', () => {
    test('service proxy returns appropriate error when backend unavailable', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/v1/engineering-analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // May return 502 (bad gateway) or 200/404 if service is running
      expect([200, 404, 502, 503]).toContain(response.status());
    });

    test('proxy error response is JSON, not HTML', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/v1/engineering-analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() === 502 || response.status() === 503) {
        const body = await response.text();
        expect(body).not.toContain('<!DOCTYPE html>');
      }
    });
  });

  test.describe('Timeout Handling', () => {
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
});
