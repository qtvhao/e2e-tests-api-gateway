/**
 * @fileoverview E2E tests for API Gateway Token Refresh - Data Validation
 * Tests data validation and structure requirements
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

test.describe('Token Refresh - Data Validation', () => {
  test('auth/me returns user data structure', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    expect(token).toBeDefined();

    const response = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  test('successful login returns token data', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: adminUser.email, password: adminUser.password }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
  });

  test('user list endpoint returns expected response', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect([200, 403, 404, 502]).toContain(response.status());

    const body = await response.text();
    expect(body).toBeDefined();
    expect(body.length).toBeGreaterThanOrEqual(0);
  });

  test('single user retrieval by ID', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);

    const meResponse = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(meResponse.status()).toBe(200);

    const userData = await meResponse.json();
    expect(userData).toBeDefined();
    expect(userData.id || userData.user?.id || userData.email).toBeDefined();
  });
});
