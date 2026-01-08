import { test, expect } from '@playwright/test';
import { getAdminToken } from '../helpers/auth';
import { expectValidApiResponse, expectSuccessResponse, expectUnauthorized } from '../helpers/api-test-utils';

/**
 * E2E tests for Settings Routes
 * Source: services/system-integration/microservices/api-gateway/routes/settings.go
 * Service: Api Gateway (system-integration)
 */

test.describe('Settings Routes', () => {
  // Add retries for flaky network timing issues
  test.describe.configure({ retries: 2 });

  test.describe('Health Check', () => {
    test('should return healthy status', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.status()).toBe(200);
      const body = await expectValidApiResponse(response);
      expect(body.status).toBeDefined();
      expect(body.status).toBe('healthy');
    });
  });

  test.describe('Settings API Routes', () => {
    test('PUT /api/v1/user-preferences/notifications updates preferences with auth', async ({ request }) => {
      const token = await getAdminToken(request);
      const testPreferences = { email: true, push: false, assignments: true, skillUpdates: false };

      const response = await request.put('/api/v1/user-preferences/notifications', {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { preferences: testPreferences }
      });
      const body = await expectSuccessResponse(response);
      expect(body).toHaveProperty('preferences');
      // Data defined check
      expect(body.preferences).toBeDefined();
      // Data validation - preferences object should have the keys we sent
      expect(typeof body.preferences).toBe('object');
      expect(body.preferences).toHaveProperty('email');
      expect(body.preferences).toHaveProperty('push');
    });

    test('GET /api/v1/user-preferences/notifications returns items array', async ({ request }) => {
      const token = await getAdminToken(request);
      const response = await request.get('/api/v1/user-preferences/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const body = await expectSuccessResponse(response);
      // Data defined check
      expect(body.items).toBeDefined();
      // Array type check
      expect(Array.isArray(body.items)).toBe(true);
      // Non-empty data validation
      expect((body.items as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    test('PUT /api/v1/user-preferences/notifications requires authentication', async ({ request }) => {
      const response = await request.put('/api/v1/user-preferences/notifications', {
        data: { preferences: { email: true } }
      });
      await expectUnauthorized(response);
    });
  });
});
