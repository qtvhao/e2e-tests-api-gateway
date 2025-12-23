import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for API Gateway V1 Admin Routes
 *
 * Tests cover:
 * - Admin routes with role-based access control
 * - System status endpoints
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

const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const adminUser = seedData.users.find(u => u.roles.includes('admin')) || seedData.users[0];
const regularUser = seedData.users.find(u => u.roles.length === 1 && u.roles.includes('user')) || seedData.users[1];

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

test.describe('API Gateway V1 Admin Routes', () => {
  test('admin routes require authentication', async ({ request }) => {
    const response = await request.get('/api/v1/admin/users');
    expect(response.status()).toBe(401);
  });

  test('admin routes require admin role', async ({ request }) => {
    // Verify we have a regular user to test with
    expect(regularUser).toBeDefined();
    expect(regularUser.roles.includes('admin')).toBeFalsy();

    const token = await getAuthToken(request, regularUser.email, regularUser.password);
    const response = await request.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Regular user should be forbidden (403) or unauthorized (401)
    expect([401, 403]).toContain(response.status());
  });

  test('admin users can access admin routes', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([401, 403]).not.toContain(response.status());
  });

  test('system status endpoint is accessible to admins', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/admin/system/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([401, 403]).not.toContain(response.status());
  });
});
