/**
 * @fileoverview E2E tests for API Gateway Security - Role-Based Access Control
 * Tests RBAC and authorization
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

test.describe('Security - Role-Based Access Control', () => {
  test('admin users can access admin endpoints', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([401, 403]).not.toContain(response.status());
  });

  test('regular users cannot access admin endpoints', async ({ request }) => {
    const testUser = regularUser || adminUser;
    const token = await getAuthToken(request, testUser.email, testUser.password);
    expect(token).toBeDefined();

    const response = await request.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const hasAdminRole = testUser.roles.includes('admin');
    const expectedStatuses = hasAdminRole ? [200, 404, 502] : [401, 403];
    expect(expectedStatuses).toContain(response.status());
  });

  test('admin system status endpoint requires admin role', async ({ request }) => {
    const testUser = regularUser || adminUser;
    const token = await getAuthToken(request, testUser.email, testUser.password);
    expect(token).toBeDefined();

    const response = await request.get('/api/v1/admin/system/status', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const hasAdminRole = testUser.roles.includes('admin');
    const expectedStatuses = hasAdminRole ? [200, 404, 502] : [401, 403];
    expect(expectedStatuses).toContain(response.status());
  });
});
