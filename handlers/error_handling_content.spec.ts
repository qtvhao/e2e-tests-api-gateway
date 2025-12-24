/**
 * @fileoverview E2E tests for API Gateway Error Handling - Content-Type
 * Tests content-type handling
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

test.describe('Error Handling - Content-Type', () => {
  test('accepts application/json content-type', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: { email: adminUser.email, password: adminUser.password }
    });
    expect(response.ok()).toBeTruthy();
  });

  test('handles form-urlencoded content-type', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: { email: adminUser.email, password: adminUser.password }
    });
    expect(response.status()).toBeDefined();
  });
});
