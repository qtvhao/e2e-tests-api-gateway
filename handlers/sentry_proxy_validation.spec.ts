/* eslint-disable playwright-custom/require-success-tests-for-error-tests */
/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/store/, not our versioned REST API */
import { test, expect } from '@playwright/test';
import { getSentryConfig, generateEventId, getSentryAuthHeader } from '../helpers/sentry-test-utils';

/**
 * E2E tests for Sentry/Bugsink Request Validation
 *
 * Tests cover:
 * - Malformed JSON handling
 * - Required field validation (event_id)
 *
 * Note: Bugsink service must be running for these tests to pass.
 *
 * ESLint disable note: require-success-tests-for-error-tests is disabled because
 * this is a proxy API test, not a CRUD endpoint. Validation tests don't require
 * the same data structure validations that endpoint tests do.
 */

const { sentryKey: SENTRY_KEY, projectId: PROJECT_ID } = getSentryConfig();

test.describe('Sentry/Bugsink Request Validation', () => {
  test('accepts valid JSON with all required fields', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
      },
      data: {
        event_id: eventId,
        message: 'Test with valid JSON',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.text();
    expect(responseBody).toBeDefined();
  });

  test('rejects malformed JSON', async ({ request }) => {
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
      },
      data: 'not valid json{',
    });

    expect(response.status()).toBe(500);
  });

  test('rejects event without event_id', async ({ request }) => {
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
      },
      data: {
        message: 'Test without event_id',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });

    expect(response.status()).toBe(500);
  });
});
