import { test, expect } from '@playwright/test';
import { getAdminToken } from '../helpers/auth';

/**
 * E2E tests for Settings Handler
 * Source: services/system-integration/microservices/api-gateway/handlers/settings.go
 * Service: Api Gateway (system-integration)
 */

test.describe('Settings Handler', () => {
  test.describe('Health Check', () => {
    test('should return healthy status', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBeDefined();
      expect(body.status).toBe('healthy');
    });
  });

  test.describe('Notification Settings Endpoint', () => {
    test('GET /api/v1/settings/notifications returns settings with auth', async ({ request }) => {
      const token = await getAdminToken(request);
      const response = await request.get('/api/v1/settings/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.error?.message).not.toBe('API endpoint not found');
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('preferences');
      // Data defined check
      expect(body.items).toBeDefined();
      expect(body.preferences).toBeDefined();
      // Array type check
      expect(Array.isArray(body.items)).toBe(true);
      // Non-empty data validation
      expect(body.items.length).toBeGreaterThanOrEqual(1);
      // Data validation - check item structure
      expect(body.items[0]).toHaveProperty('key');
      expect(body.items[0]).toHaveProperty('label');
      expect(body.items[0]).toHaveProperty('description');
    });

    test('GET /api/v1/settings/notifications requires authentication', async ({ request }) => {
      const response = await request.get('/api/v1/settings/notifications');
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error?.message).not.toBe('API endpoint not found');
    });
  });
});
