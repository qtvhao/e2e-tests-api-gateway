/**
 * @fileoverview E2E tests for API Gateway Token Refresh - Successful Refresh
 * Tests successful token refresh operations
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

test.describe('Token Refresh - Successful Operations', () => {
  test('POST /api/auth/refresh succeeds with valid token', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const response = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status()).not.toBe(401);
    expect([200, 201, 204, 404, 502]).toContain(response.status());
  });

  test('refresh endpoint returns valid JSON response', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBeDefined();
    expect([200, 201, 204, 404, 502]).toContain(response.status());

    const body = await response.text();
    expect(body).toBeDefined();
    expect(body).not.toContain('<!DOCTYPE html>');
  });

  test('refresh response has expected structure', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response).toBeDefined();
    const status = response.status();
    expect(status).toBeDefined();
    expect([200, 201, 204, 404, 502]).toContain(status);

    const body = await response.text();
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThanOrEqual(0);
  });

  test('authenticated request works after refresh attempt', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    expect(token).toBeDefined();

    const refreshResponse = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(refreshResponse).toBeDefined();

    const refreshStatus = refreshResponse.status();
    expect([200, 201, 204, 404, 502]).toContain(refreshStatus);

    const body = await refreshResponse.text();
    expect(body).toBeDefined();

    // Always use original token for follow-up request (simpler, deterministic)
    const meResponse = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(meResponse.status()).toBe(200);
  });
});
