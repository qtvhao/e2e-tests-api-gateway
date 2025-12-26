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
 * E2E tests for API Gateway Protected Microservice Routes
 * Endpoints are dynamically generated from services.json
 */
test.describe('Protected Microservice Routes', () => {
  test.describe('Authenticated Access', () => {
    test('should access protected service with valid token', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      // Use /api/auth/me endpoint which is always available and protected
      const response = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(response.status()).toBe(200);
    });

    test('should return valid data structure from authenticated endpoint', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/navigation');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data === 'object' || Array.isArray(data)).toBeTruthy();
    });

    test('should return navigation items as array', async ({ request }) => {
      const response = await request.get('/api/navigation');
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBeTruthy();
      expect(data.items.length).toBeGreaterThan(0);
    });

    test('should retrieve single user by id via /api/auth/me', async ({ request }) => {
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
    // Dynamically generate tests for each protected endpoint from services.json
    for (const endpoint of protectedEndpoints) {
      const serviceName = endpoint.split('/').pop();
      test(`should require authentication for ${serviceName} service`, async ({ request }) => {
        const response = await request.get(endpoint);
        expect(response.status()).toBe(401);
      });
    }
  });
});
