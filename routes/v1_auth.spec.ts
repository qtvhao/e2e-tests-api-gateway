import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for API Gateway V1 Authentication
 *
 * Tests cover:
 * - Protected endpoints requiring authentication
 * - Token-based access to protected routes
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

test.describe('API Gateway V1 Authentication', () => {
  test('protected routes return 401 without token', async ({ request }) => {
    const protectedEndpoints = [
      '/api/v1/engineering-analytics',
      '/api/v1/goal-management',
      '/api/v1/hr-management',
      '/api/v1/project-management',
      '/api/v1/system-integration',
      '/api/v1/workforce-wellbeing',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test('protected routes work with valid token', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);

    const response = await request.get('/api/v1/hr-management', {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Should not return 401 (may return 200, 404, or 502 depending on backend service)
    expect(response.status()).not.toBe(401);
  });
});
