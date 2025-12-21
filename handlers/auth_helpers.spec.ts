import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for Authentication Helper Functions
 *
 * Tests cover the authentication flow that uses auth_helpers:
 * - User credential validation
 * - JWT token generation and structure
 * - Role assignment based on email patterns
 * - Token expiration and refresh
 */

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

// Load test users from seed.json
const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

// Get different user types for testing
const allUsers = seedData.users;
const adminUser = allUsers.find(u => u.roles.includes('admin')) || allUsers[0];
const regularUser = allUsers.find(u => !u.roles.includes('admin')) || allUsers[0];

// Helper to decode JWT payload
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
}

test.describe('Authentication Helpers', () => {
  test.describe('Credential Validation', () => {
    test('valid credentials return user info and token', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe(adminUser.email);
      expect(data.user.name).toBe(adminUser.name);
    });

    test('invalid password returns authentication error', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: 'wrongpassword' }
      });
      expect(response.status()).toBe(401);
    });

    test('non-existent email returns authentication error', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: 'nonexistent@example.com', password: 'anypassword' }
      });
      expect(response.status()).toBe(401);
    });

    test('empty credentials return bad request', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: '', password: '' }
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('JWT Token Generation', () => {
    test('token has valid JWT structure', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { token } = await response.json();

      const parts = token.split('.');
      expect(parts.length).toBe(3);
    });

    test('token payload contains user information', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { token } = await response.json();
      const payload = decodeJwtPayload(token);

      expect(payload.email).toBe(adminUser.email);
      expect(payload.user_id || payload.sub).toBeDefined();
    });

    test('token payload contains roles', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { token } = await response.json();
      const payload = decodeJwtPayload(token);

      expect(payload.roles).toBeDefined();
      expect(Array.isArray(payload.roles)).toBeTruthy();
    });

    test('token has valid expiration time', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { token } = await response.json();
      const payload = decodeJwtPayload(token);

      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.iat).toBeLessThanOrEqual(now + 5);
    });
  });

  test.describe('Role Assignment', () => {
    test('admin user has admin role', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { user } = await response.json();

      expect(user.roles).toContain('admin');
    });

    test('each user has their assigned roles from seed', async ({ request }) => {
      for (const user of allUsers) {
        const response = await request.post('/api/auth/login', {
          data: { email: user.email, password: user.password }
        });
        const data = await response.json();

        for (const role of user.roles) {
          expect(data.user.roles).toContain(role);
        }
      }
    });
  });

  test.describe('Token Refresh', () => {
    test('can refresh valid token', async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { token } = await loginResponse.json();

      const refreshResponse = await request.post('/api/auth/refresh', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(refreshResponse.ok()).toBeTruthy();

      const refreshData = await refreshResponse.json();
      expect(refreshData.token).toBeDefined();
    });

    test('refreshed token works for protected endpoints', async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { token } = await loginResponse.json();

      const refreshResponse = await request.post('/api/auth/refresh', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const { token: newToken } = await refreshResponse.json();

      const meResponse = await request.get('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      });
      expect(meResponse.ok()).toBeTruthy();
    });
  });

  test.describe('Protected Endpoint Access', () => {
    test('valid token grants access to protected endpoints', async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: adminUser.email, password: adminUser.password }
      });
      const { token } = await loginResponse.json();

      const meResponse = await request.get('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(meResponse.ok()).toBeTruthy();
    });

    test('invalid token denies access', async ({ request }) => {
      const response = await request.get('/api/auth/me', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      expect(response.status()).toBe(401);
    });

    test('missing token denies access', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);
    });
  });
});
