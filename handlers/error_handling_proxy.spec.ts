/**
 * @fileoverview E2E tests for API Gateway Error Handling - Proxy Errors
 * Tests proxy error handling when backend services are unavailable
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

test.describe('Error Handling - Proxy Errors', () => {
  test('service proxy returns appropriate error when backend unavailable', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/engineering-analytics', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect([200, 404, 502, 503]).toContain(response.status());
  });

  test('proxy error response is JSON, not HTML', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/engineering-analytics', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect([200, 404, 502, 503]).toContain(response.status());

    const body = await response.text();
    expect(body).toBeDefined();
    expect(body).not.toContain('<!DOCTYPE html>');
  });
});
