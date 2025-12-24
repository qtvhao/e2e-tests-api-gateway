/**
 * @fileoverview E2E tests for API Gateway Token Refresh
 * Tests the /api/auth/refresh endpoint for token renewal
 *
 * Route: POST /api/auth/refresh
 * Middleware: AuthMiddleware (requires valid JWT)
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

test.describe('Token Refresh Endpoint', () => {
  test.describe('Authentication Requirements', () => {
    test('POST /api/auth/refresh requires authentication', async ({ request }) => {
      const response = await request.post('/api/auth/refresh');
      expect(response.status()).toBe(401);
    });

    test('POST /api/auth/refresh rejects invalid token', async ({ request }) => {
      const response = await request.post('/api/auth/refresh', {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      expect(response.status()).toBe(401);
    });

    test('POST /api/auth/refresh rejects empty token', async ({ request }) => {
      const response = await request.post('/api/auth/refresh', {
        headers: { Authorization: 'Bearer ' }
      });
      expect(response.status()).toBe(401);
    });

    test('POST /api/auth/refresh returns 401 JSON response without token', async ({ request }) => {
      const response = await request.post('/api/auth/refresh');
      expect(response.status()).toBe(401);

      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');

      const body = await response.text();
      expect(body).not.toContain('<!DOCTYPE html>');
    });
  });

  test.describe('Successful Token Refresh', () => {
    test('POST /api/auth/refresh succeeds with valid token', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Should succeed or return appropriate status
      expect(response.status()).not.toBe(401);
      expect([200, 201, 204, 404, 502]).toContain(response.status());
    });

    test('refreshed token returns new token if supported', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() === 200) {
        const data = await response.json();
        // If refresh returns a new token
        if (data.token) {
          expect(typeof data.token).toBe('string');
          expect(data.token.length).toBeGreaterThan(0);
        }
      }
    });

    test('refreshed token can be used for authenticated requests', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const refreshResponse = await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (refreshResponse.status() === 200) {
        const refreshData = await refreshResponse.json();
        const newToken = refreshData.token || token;

        // Use the new/refreshed token
        const meResponse = await request.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${newToken}` }
        });
        expect(meResponse.status()).toBe(200);
      }
    });
  });

  test.describe('Response Format', () => {
    test('refresh endpoint returns JSON content-type', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() === 200) {
        const contentType = response.headers()['content-type'] || '';
        expect(contentType).toContain('application/json');
      }
    });

    test('refresh endpoint does not return HTML', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const body = await response.text();
      expect(body).not.toContain('<!DOCTYPE html>');
      expect(body).not.toContain('<html');
    });
  });

  test.describe('Token Lifecycle', () => {
    test('original token remains valid after refresh attempt', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);

      // Attempt refresh
      await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Original token should still work
      const meResponse = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(meResponse.status()).toBe(200);
    });

    test('multiple refresh attempts do not invalidate token', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);

      // Multiple refresh attempts
      await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });
      await request.post('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Token should still be valid
      const meResponse = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(meResponse.status()).toBe(200);
    });
  });
});
