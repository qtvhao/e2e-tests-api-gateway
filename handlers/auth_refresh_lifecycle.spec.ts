/**
 * @fileoverview E2E tests for API Gateway Token Refresh - Token Lifecycle
 * Tests token lifecycle behavior after refresh
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

test.describe('Token Refresh - Token Lifecycle', () => {
  test('original token remains valid after refresh attempt', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);

    await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const meResponse = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(meResponse.status()).toBe(200);
  });

  test('multiple refresh attempts do not invalidate token', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);

    await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });
    await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const meResponse = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(meResponse.status()).toBe(200);
  });
});
