import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for API Gateway V1 Service Proxy Routes
 *
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

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

test.describe('API Gateway V1 Service Proxy Routes', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    authToken = await getAuthToken(request, adminUser.email, adminUser.password);
  });
});
