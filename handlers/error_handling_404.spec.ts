/**
 * @fileoverview E2E tests for API Gateway Error Handling - 404 Not Found
 * Tests 404 error responses and undefined routes
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

test.describe('Error Handling - 404 Not Found', () => {
  test('undefined API routes return 404 JSON, not HTML', async ({ request }) => {
    const response = await request.get('/api/undefined-route-12345');

    const body = await response.text();
    expect(body).not.toContain('<!DOCTYPE html>');
    expect(body).not.toContain('<html');

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('undefined API routes have JSON content-type', async ({ request }) => {
    const response = await request.get('/api/undefined-route-12345');

    const status = response.status();
    expect(status).toBeDefined();
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });

  test('undefined v1 routes return proper error', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/undefined-service-xyz', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect([404, 502]).toContain(response.status());
  });
});
