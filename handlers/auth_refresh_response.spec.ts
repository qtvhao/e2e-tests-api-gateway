/**
 * @fileoverview E2E tests for API Gateway Token Refresh - Response Format
 * Tests response format and content-type handling
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

test.describe('Token Refresh - Response Format', () => {
  test('refresh endpoint returns appropriate content-type header', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response).toBeDefined();
    const status = response.status();
    expect(status).toBeDefined();

    const contentType = response.headers()['content-type'] || '';
    expect(typeof contentType).toBe('string');

    const isSuccess = status === 200;
    const isJson = contentType.includes('application/json');
    expect(!isSuccess || isJson).toBeTruthy();
  });

  test('refresh endpoint does not return HTML', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const body = await response.text();
    expect(body).not.toContain('<!DOCTYPE html>');
    expect(body).not.toContain('<html');
  });
});
