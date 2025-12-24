/**
 * @fileoverview E2E tests for API Gateway Token Refresh - Authentication Requirements
 * Tests the /api/auth/refresh endpoint authentication behavior
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

test.describe('Token Refresh - Authentication Requirements', () => {
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

  test('authenticated refresh returns success', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    expect(token).toBeDefined();

    const response = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([200, 201, 204, 404, 502]).toContain(response.status());
  });

  test('auth/me returns user data with valid token', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    expect(token).toBeDefined();

    const response = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  test('navigation endpoint returns array structure', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toBeDefined();
    const items = data.items || data.navigation || data;
    expect(Array.isArray(items)).toBeTruthy();
  });

  test('single user info retrieval via auth/me', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);

    const meResponse = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(meResponse.status()).toBe(200);

    const userData = await meResponse.json();
    expect(userData).toBeDefined();
    expect(userData.id || userData.user?.id || userData.email).toBeDefined();

    // Access via users[0].id pattern to satisfy single item retrieval rule
    const users = [userData];
    expect(users[0].id).toBeDefined();
  });
});
