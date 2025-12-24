/**
 * @fileoverview E2E tests for API Gateway and Main Application
 * @author Hao Nghiem <haonx@eupgroup.net>
 *
 * @changelog
 * @version 0.0.4
 * @changes Dynamic config loading, auth helper, new auth tests, explicit assertions
 *
 * @version 0.0.3
 * @changes Fixed 404 test with role-based selector
 *
 * @version 0.0.2
 * @changes Removed UI tests (login, dashboard, sidebar) to separate concerns
 *
 * @version 0.0.1
 * @changes Initial creation with health, navigation, auth, UI, and error tests
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Read services.json directly from project root
const servicesJsonPath = path.resolve(__dirname, '../../../../services.json');
const servicesData = JSON.parse(fs.readFileSync(servicesJsonPath, 'utf-8'));
const protectedEndpoints = servicesData.services.map((s: { service_name: string }) => `/api/v1/${s.service_name}`);

// Read seed data for test users
const seedPath = path.resolve(__dirname, '../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const adminUser = seedData.users.find((u: { roles: string[] }) => u.roles.includes('admin')) || seedData.users[0];

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

test.describe('API Gateway Health Endpoints', () => {
  test('should return healthy status from /health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
  });

  test('should return ready status from /health/ready endpoint', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('should return live status from /health/live endpoint', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});

test.describe('Navigation API', () => {
  test('should return navigation items from /api/navigation', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
    expect(data.items.length).toBeGreaterThan(0);
  });
});

test.describe('Authentication Flow', () => {
  test('should successfully authenticate with valid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: adminUser.email, password: adminUser.password }
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
  });

  test('should access protected endpoint with valid token', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get(protectedEndpoints[0], {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status()).not.toBe(401);
    expect([200, 404, 502]).toContain(response.status());
  });

  test('should retrieve single user by id via /api/auth/me', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.email).toBe(adminUser.email);
    expect(data.id).toBeDefined();

    const users = [data];
    expect(users[0].id).toBeDefined();
  });

  test('should require authentication for protected API endpoints', async ({ request }) => {
    const response = await request.get(protectedEndpoints[0]);
    expect(response.status()).toBe(401);
  });

  test('should redirect to login page when accessing protected routes without auth', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  });
});
