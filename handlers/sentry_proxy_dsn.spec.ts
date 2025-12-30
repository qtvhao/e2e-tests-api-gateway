/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/store/, not our versioned REST API */
import { test, expect } from '@playwright/test';
import { getSentryConfig, generateEventId, getSentryAuthHeader } from '../helpers/sentry-test-utils';

/**
 * E2E tests for Sentry/Bugsink DSN Parsing
 *
 * Tests cover:
 * - DSN parsing from query string parameters
 * - Alternative authentication mechanisms
 *
 * Note: Bugsink service must be running for these tests to pass.
 */

const { sentryKey: SENTRY_KEY, projectId: PROJECT_ID } = getSentryConfig();

test.describe('Sentry/Bugsink DSN Parsing', () => {
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
