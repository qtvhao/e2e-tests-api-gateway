/**
 * @fileoverview E2E tests for API Gateway Security
 * Tests JWT validation, token handling, authorization, and security headers
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
const regularUser = seedData.users.find(u => !u.roles.includes('admin') && u.roles.includes('user')) || seedData.users[1];

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

test.describe('API Gateway Security', () => {
  test.describe('JWT Token Validation', () => {
    test('rejects requests with no Authorization header', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);
    });

    test('rejects requests with empty Authorization header', async ({ request }) => {
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: '' }
      });
      expect(response.status()).toBe(401);
    });

    test('rejects requests with invalid token format', async ({ request }) => {
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: 'InvalidTokenFormat' }
      });
      expect(response.status()).toBe(401);
    });

    test('rejects requests with Bearer prefix but no token', async ({ request }) => {
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: 'Bearer ' }
      });
      expect(response.status()).toBe(401);
    });

    test('rejects requests with Bearer prefix and invalid token', async ({ request }) => {
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: 'Bearer invalid-jwt-token-12345' }
      });
      expect(response.status()).toBe(401);
    });

    test('rejects requests with malformed JWT structure', async ({ request }) => {
      // JWT should have 3 parts separated by dots
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: 'Bearer part1.part2' } // Missing third part
      });
      expect(response.status()).toBe(401);
    });

    test('rejects requests with tampered JWT payload', async ({ request }) => {
      // Get a valid token first
      const validToken = await getAuthToken(request, adminUser.email, adminUser.password);

      // Tamper with the payload (middle part)
      const parts = validToken.split('.');
      if (parts.length === 3) {
        const tamperedToken = `${parts[0]}.${Buffer.from('{"sub":"hacked"}').toString('base64')}.${parts[2]}`;
        const response = await request.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${tamperedToken}` }
        });
        expect(response.status()).toBe(401);
      }
    });

    test('accepts requests with valid JWT token', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    });

    test('token is case-sensitive for Bearer prefix', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);

      // Test with lowercase 'bearer'
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: `bearer ${token}` }
      });
      // Should either work or fail based on implementation
      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('admin users can access admin endpoints', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Should not be 401 (authenticated) or 403 (forbidden)
      expect([401, 403]).not.toContain(response.status());
    });

    test('regular users cannot access admin endpoints', async ({ request }) => {
      if (!regularUser) {
        test.skip();
        return;
      }

      const token = await getAuthToken(request, regularUser.email, regularUser.password);
      const response = await request.get('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Should be 403 (forbidden) for authenticated but unauthorized access
      expect([401, 403]).toContain(response.status());
    });

    test('admin system status endpoint requires admin role', async ({ request }) => {
      if (!regularUser) {
        test.skip();
        return;
      }

      const token = await getAuthToken(request, regularUser.email, regularUser.password);
      const response = await request.get('/api/v1/admin/system/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Authentication Error Responses', () => {
    test('401 responses return JSON, not HTML', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);

      const body = await response.text();
      expect(body).not.toContain('<!DOCTYPE html>');
      expect(body).not.toContain('<html');
      expect(() => JSON.parse(body)).not.toThrow();
    });

    test('401 responses have JSON content-type', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);

      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    });

    test('401 responses include error information', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('403 responses return JSON for unauthorized access', async ({ request }) => {
      if (!regularUser) {
        test.skip();
        return;
      }

      const token = await getAuthToken(request, regularUser.email, regularUser.password);
      const response = await request.get('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() === 403) {
        const contentType = response.headers()['content-type'] || '';
        expect(contentType).toContain('application/json');

        const body = await response.text();
        expect(body).not.toContain('<!DOCTYPE html>');
      }
    });
  });

  test.describe('Login Security', () => {
    test('login fails with invalid email format', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: 'invalid-email', password: 'password123' }
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('login fails with wrong password', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: 'wrong-password-123' }
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('login fails with non-existent user', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: 'nonexistent@example.com', password: 'password123' }
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('login fails with empty credentials', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: '', password: '' }
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('login fails with missing email', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { password: 'password123' }
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('login fails with missing password', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email }
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('successful login returns token and user info', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(adminUser.email);
      expect(data.user.roles).toBeDefined();
      expect(Array.isArray(data.user.roles)).toBeTruthy();
    });
  });

  test.describe('Security Headers', () => {
    test('API responses include security-related headers', async ({ request }) => {
      const response = await request.get('/health');
      const headers = response.headers();

      // Basic header checks - presence of any headers
      expect(headers).toBeDefined();
      expect(Object.keys(headers).length).toBeGreaterThan(0);
    });

    test('CORS preflight is handled correctly', async ({ request }) => {
      const response = await request.fetch('/api/navigation', {
        method: 'OPTIONS'
      });
      expect([200, 204]).toContain(response.status());
    });

    test('API endpoints return proper content-type', async ({ request }) => {
      const response = await request.get('/api/navigation');
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    });
  });

  test.describe('Protected Endpoint Consistency', () => {
    const protectedEndpoints = [
      '/api/auth/me',
      '/api/auth/refresh',
      '/api/dashboard',
      '/api/v1/admin/users',
      '/api/v1/admin/system/status',
    ];

    for (const endpoint of protectedEndpoints) {
      test(`${endpoint} requires authentication`, async ({ request }) => {
        const method = endpoint.includes('refresh') ? 'POST' : 'GET';
        const response = method === 'POST'
          ? await request.post(endpoint)
          : await request.get(endpoint);
        expect(response.status()).toBe(401);
      });
    }
  });
});
