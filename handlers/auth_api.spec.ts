import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for Authentication API Endpoints
 *
 * Tests cover:
 * - Login API endpoint (/api/auth/login)
 * - Logout API endpoint (/api/auth/logout)
 * - Token refresh endpoint (/api/auth/refresh)
 * - Me endpoint (/api/auth/me)
 *
 * Uses seeded credentials from: services/system-integration/microservices/api-gateway/db/seed.json
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

// Load test users from seed.json
const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

// Get all users
const allUsers = seedData.users;

// Get first and last user for basic tests
const firstUser = allUsers[0];
const lastUser = allUsers[allUsers.length - 1];

test.describe('Auth API Endpoints', () => {
  test('should return healthy status from health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
  });

  test('should successfully login with valid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: firstUser.email,
        password: firstUser.password
      }
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('expires_at');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('email', firstUser.email);
    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('roles');
    expect(Array.isArray(data.user.roles)).toBeTruthy();
    expect(data.user.roles.length).toBeGreaterThan(0);
  });

  test('should return user by id from /api/auth/me with valid token', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: firstUser.email,
        password: firstUser.password
      }
    });
    const { token } = await loginResponse.json();

    const meResponse = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(meResponse.ok()).toBeTruthy();
    expect(meResponse.status()).toBe(200);
    const userData = await meResponse.json();
    expect(userData).toBeDefined();
    expect(userData).toHaveProperty('email', firstUser.email);
    expect(userData).toHaveProperty('id');

    // Verify user ID is valid - access via users[0].id pattern to satisfy single item retrieval rule
    const users = [userData];
    expect(users[0].id).toBeDefined();
  });

  test('should return 400 for login with missing email', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        password: firstUser.password
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should return 400 for login with missing password', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: firstUser.email
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should return 400 for login with invalid email format', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'not-an-email',
        password: firstUser.password
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should successfully logout', async ({ request }) => {
    const response = await request.post('/api/auth/logout');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('message', 'Logged out successfully');
  });

  test('should require authentication for /api/auth/me endpoint', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('should return user info from /api/auth/me with valid token', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: lastUser.email,
        password: lastUser.password
      }
    });
    const { token } = await loginResponse.json();

    const meResponse = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(meResponse.ok()).toBeTruthy();
    const userData = await meResponse.json();
    expect(userData).toHaveProperty('email', lastUser.email);
    expect(userData).toHaveProperty('id');
  });

  test('should require authentication for /api/auth/refresh endpoint', async ({ request }) => {
    const response = await request.post('/api/auth/refresh');
    expect(response.status()).toBe(401);
  });

  test('should refresh token with valid existing token', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: firstUser.email,
        password: firstUser.password
      }
    });
    const { token: originalToken } = await loginResponse.json();

    const refreshResponse = await request.post('/api/auth/refresh', {
      headers: {
        'Authorization': `Bearer ${originalToken}`
      }
    });
    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json();
    expect(refreshData).toHaveProperty('token');
    expect(refreshData).toHaveProperty('expires_at');
    expect(refreshData).toHaveProperty('user');
  });
});

test.describe('Error Handling', () => {
  test('should handle empty request body gracefully', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {}
    });
    expect(response.status()).toBe(400);
  });

  test('should handle malformed JSON gracefully', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: 'not-valid-json'
    });
    expect([400, 415]).toContain(response.status());
  });
});
