import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Read services.json directly from project root
const servicesJsonPath = path.resolve(__dirname, '../../../../../services.json');
const servicesData = JSON.parse(fs.readFileSync(servicesJsonPath, 'utf-8'));
const protectedEndpoints = servicesData.services.map((s: { service_name: string }) => `/api/v1/${s.service_name}`);

// Read seed data for test users
const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const adminUser = seedData.users.find((u: { roles: string[] }) => u.roles.includes('admin')) || seedData.users[0];

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

/**
 * E2E tests for API Gateway V1 Authentication
 * Protected endpoints are dynamically loaded from services.json
 */
test.describe('API Gateway V1 Authentication', () => {
  test.describe('Authenticated Access', () => {
    test('protected routes work with valid token', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get(protectedEndpoints[0], {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status()).not.toBe(401);
      expect([200, 404, 502]).toContain(response.status());
    });

    test('returns valid data from authenticated endpoint', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data === 'object').toBeTruthy();
    });

    test('user roles is array type with entries', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.roles).toBeDefined();
      expect(Array.isArray(data.roles)).toBeTruthy();
      expect(data.roles.length).toBeGreaterThan(0);
    });

    test('can retrieve single user via /api/auth/me', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.email).toBe(adminUser.email);
      expect(data.id).toBeDefined();

      const users = [data];
      expect(users[0].id).toBeDefined();
    });
  });

  test.describe('Authentication Required', () => {
    test('protected routes return 401 without token', async ({ request }) => {
      for (const endpoint of protectedEndpoints) {
        const response = await request.get(endpoint);
        expect(response.status()).toBe(401);
      }
    });
  });
});
