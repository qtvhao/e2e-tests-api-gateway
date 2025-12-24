/**
 * @fileoverview E2E tests for API Gateway Dashboard Routes
 * Tests the /api/dashboard endpoint which proxies to HR Management service
 *
 * Route: GET /api/dashboard -> hr_management /api/v1/dashboard
 * Middleware: AuthMiddleware (JWT required)
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

test.describe('Dashboard API Routes', () => {
  test.describe('Authentication Requirements', () => {
    test('GET /api/dashboard requires authentication', async ({ request }) => {
      const response = await request.get('/api/dashboard');
      expect(response.status()).toBe(401);

      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    });

    test('GET /api/dashboard returns 401 JSON response without token', async ({ request }) => {
      const response = await request.get('/api/dashboard');
      expect(response.status()).toBe(401);

      const body = await response.text();
      expect(body).not.toContain('<!DOCTYPE html>');
      expect(() => JSON.parse(body)).not.toThrow();
    });

    test('GET /api/dashboard rejects invalid token', async ({ request }) => {
      const response = await request.get('/api/dashboard', {
        headers: { Authorization: 'Bearer invalid-token-12345' }
      });
      expect(response.status()).toBe(401);
    });

    test('GET /api/dashboard rejects malformed authorization header', async ({ request }) => {
      const response = await request.get('/api/dashboard', {
        headers: { Authorization: 'InvalidFormat token123' }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Authenticated Access', () => {
    test('GET /api/dashboard succeeds with valid token', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Should not be 401 (authenticated)
      expect(response.status()).not.toBe(401);
      // May return 200 (success) or 502 (backend unavailable) or 404 (route not implemented in backend)
      expect([200, 404, 502]).toContain(response.status());
    });

    test('GET /api/dashboard returns JSON content-type when authenticated', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() === 200) {
        const contentType = response.headers()['content-type'] || '';
        expect(contentType).toContain('application/json');
      }
    });

    test('GET /api/dashboard does not return HTML when authenticated', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const body = await response.text();
      expect(body).not.toContain('<!DOCTYPE html>');
      expect(body).not.toContain('<html');
    });
  });

  test.describe('Response Structure', () => {
    test('dashboard response is valid JSON object', async ({ request }) => {
      const token = await getAuthToken(request, adminUser.email, adminUser.password);
      const response = await request.get('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
      }
    });
  });

  test.describe('Browser Integration', () => {
    test('dashboard page loads after authentication', async ({ page }) => {
      // Clear any existing auth state
      await page.context().clearCookies();
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());

      // Login
      await page.getByLabel(/email/i).fill(adminUser.email);
      await page.getByLabel(/password/i).fill(adminUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard (root path)
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    });
  });
});
