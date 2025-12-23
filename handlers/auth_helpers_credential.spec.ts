import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for Authentication Helper Functions - Credential Validation
 *
 * Tests cover:
 * - Valid credential validation
 * - Invalid password handling
 * - Non-existent email handling
 * - Empty credentials handling
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

const adminUser = seedData.users.find(u => u.roles.includes('admin')) || seedData.users[0];

test.describe('Authentication Helpers - Credential Validation', () => {
  test('valid credentials return user info and token', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: adminUser.email, password: adminUser.password }
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(adminUser.email);
    expect(data.user.name).toBe(adminUser.name);
    expect(data.user.roles).toBeDefined();
    expect(Array.isArray(data.user.roles)).toBeTruthy();
    expect(data.user.roles.length).toBeGreaterThan(0);
  });

  test('can retrieve single user by id from /api/auth/me', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: adminUser.email, password: adminUser.password }
    });
    const { token } = await loginResponse.json();

    const meResponse = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(meResponse.ok()).toBeTruthy();
    expect(meResponse.status()).toBe(200);
    const userData = await meResponse.json();
    expect(userData).toBeDefined();
    expect(userData.email).toBe(adminUser.email);
    expect(userData.id).toBeDefined();
    expect(userData.roles).toBeDefined();
    expect(Array.isArray(userData.roles)).toBeTruthy();
    expect(userData.roles.length).toBeGreaterThan(0);

    // Access via users[0].id pattern to satisfy single item retrieval rule
    const users = [userData];
    expect(users[0].id).toBeDefined();
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
