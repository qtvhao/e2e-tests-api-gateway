/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/store/, not our versioned REST API */
import { test, expect } from '@playwright/test';
import { getSentryConfig, generateEventId, getSentryAuthHeader } from '../helpers/sentry-test-utils';

/**
 * E2E tests for Sentry/Bugsink Store API
 *
 * Tests cover:
 * - Sentry proxy route availability (/sentry/*)
 * - Sentry store API endpoint (/sentry/api/{project_id}/store/)
 * - Error capture with various event levels
 *
 * Note: Bugsink service must be running for these tests to pass.
 * DSN: http://{sentry_key}@localhost:8080/sentry/{project_id}
 */

const { sentryKey: SENTRY_KEY, projectId: PROJECT_ID } = getSentryConfig();

test.describe('Sentry/Bugsink Store API', () => {
  test.describe('Route Availability', () => {
    test('sentry proxy route exists and responds', async ({ request }) => {
      const response = await request.get('/sentry/', {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(302);
    });

    test('sentry store API endpoint is accessible', async ({ request }) => {
      // Test that the store endpoint exists by sending a minimal OPTIONS request
      const response = await request.fetch(`/sentry/api/${PROJECT_ID}/store/`, {
        method: 'OPTIONS',
        maxRedirects: 0,
      });
      expect(response.status()).toBe(204);
    });
  });

  test.describe('Error Capture', () => {
    test('accepts valid error event with correct auth header', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
          'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
          'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
          'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
});
