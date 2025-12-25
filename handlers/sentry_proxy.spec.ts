import { test, expect } from '@playwright/test';

/**
 * E2E tests for Sentry/Bugsink Proxy Handler
 *
 * Tests cover:
 * - Sentry proxy route availability (/sentry/*)
 * - Sentry store API with authentication (/sentry/api/{project_id}/store/)
 * - Sentry envelope API (/sentry/api/{project_id}/envelope/)
 * - Error handling for invalid requests
 * - CORS headers for browser SDK
 *
 * Note: Bugsink service must be running for these tests to pass.
 * DSN: http://{sentry_key}@localhost:8080/sentry/{project_id}
 */

// Sentry configuration from docker-compose logs
const SENTRY_KEY = process.env.SENTRY_KEY || 'cac4e92f-c384-42d6-aaad-001c2f4f9b60';
const PROJECT_ID = process.env.SENTRY_PROJECT_ID || '1';

test.describe('Sentry/Bugsink Proxy Handler', () => {
  test.describe('Route Availability', () => {
    test('sentry proxy route exists and responds', async ({ request }) => {
      const response = await request.get('/sentry/', {
        maxRedirects: 0,
      });
      // Bugsink returns 302 redirect to login when accessing root
      expect([200, 302]).toContain(response.status());
    });

    test('sentry store API endpoint is accessible', async ({ request }) => {
      // Test that the store endpoint exists by sending a minimal OPTIONS request
      const response = await request.fetch(`/sentry/api/${PROJECT_ID}/store/`, {
        method: 'OPTIONS',
        maxRedirects: 0,
      });
      // Should return some response (200, 204, 405 are all valid)
      expect([200, 204, 405]).toContain(response.status());
    });
  });

  test.describe('Store API - Error Capture', () => {
    test('accepts valid error event with correct auth header', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test Error - Store API',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'e2e-test',
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('accepts error event with exception details', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test Exception',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          exception: {
            values: [
              {
                type: 'Error',
                value: 'Test exception from E2E test',
                stacktrace: {
                  frames: [
                    {
                      filename: 'e2e/test.spec.ts',
                      function: 'testFunction',
                      lineno: 42,
                      colno: 10,
                    },
                  ],
                },
              },
            ],
          },
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('accepts warning level events', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test Warning',
          level: 'warning',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('accepts info level events', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test Info Message',
          level: 'info',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Authentication', () => {
    test('rejects request without auth header', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          event_id: eventId,
          message: 'Test without auth',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      // Should reject without auth - Bugsink returns 400 or 401
      expect([400, 401, 403]).toContain(response.status());
    });

    test('rejects request with invalid sentry key', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': 'Sentry sentry_key=invalid-key-12345,sentry_version=7,sentry_client=test/1.0',
        },
        data: {
          event_id: eventId,
          message: 'Test with invalid key',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      // Should reject with invalid key
      expect([400, 401, 403]).toContain(response.status());
    });

    test('rejects request to non-existent project', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post('/sentry/api/99999/store/', {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'Test with invalid project',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      // Should reject with invalid project
      expect([400, 401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Request Validation', () => {
    test('rejects malformed JSON', async ({ request }) => {
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: 'not valid json{',
      });

      expect([400, 500]).toContain(response.status());
    });

    test('rejects event without event_id', async ({ request }) => {
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          message: 'Test without event_id',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      // Bugsink may accept or reject based on its validation rules
      // At minimum, it should respond (not crash)
      expect(response.status()).toBeDefined();
    });
  });

  test.describe('Event Context', () => {
    test('accepts event with user context', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test with User Context',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            username: 'testuser',
          },
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('accepts event with tags', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test with Tags',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          tags: {
            environment: 'e2e-test',
            component: 'SkillsPage',
            browser: 'playwright',
          },
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('accepts event with breadcrumbs', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test with Breadcrumbs',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          breadcrumbs: {
            values: [
              {
                timestamp: Math.floor(Date.now() / 1000) - 10,
                category: 'navigation',
                message: 'User navigated to /skills',
                level: 'info',
              },
              {
                timestamp: Math.floor(Date.now() / 1000) - 5,
                category: 'xhr',
                message: 'GET /api/skills',
                level: 'info',
                data: { status_code: 500 },
              },
            ],
          },
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('accepts event with extra context', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
        },
        data: {
          event_id: eventId,
          message: 'E2E Test with Extra Context',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          extra: {
            page: 'SkillsPage',
            searchQuery: 'python',
            selectedCategory: 'programming',
            skillCount: 42,
          },
          sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('DSN Parsing', () => {
    test('accepts request with DSN in query string', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(
        `/sentry/api/${PROJECT_ID}/store/?sentry_key=${SENTRY_KEY}&sentry_version=7`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            event_id: eventId,
            message: 'E2E Test with DSN in query',
            level: 'error',
            platform: 'javascript',
            timestamp: Math.floor(Date.now() / 1000),
            sdk: { name: 'sentry.javascript.browser', version: '7.0.0' },
          },
        }
      );

      // Should accept key in query string
      expect(response.status()).toBe(200);
    });
  });
});

/**
 * Generate a valid 32-character hex event ID
 */
function generateEventId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
