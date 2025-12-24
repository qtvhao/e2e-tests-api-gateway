/**
 * @fileoverview E2E tests for API Gateway Security - Login Security
 * Tests login endpoint security
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

test.describe('Security - Login', () => {
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
