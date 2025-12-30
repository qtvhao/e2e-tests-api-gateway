/* eslint-disable playwright-custom/require-success-tests-for-error-tests */
/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/store/, not our versioned REST API */
import { test, expect } from '@playwright/test';
import { getSentryConfig, generateEventId, getSentryAuthHeader } from '../helpers/sentry-test-utils';

/**
 * E2E tests for Sentry/Bugsink Authentication
 *
 * Tests cover:
 * - Authentication header validation
 * - Invalid Sentry key handling
 * - Project ID validation
 *
 * Note: Bugsink service must be running for these tests to pass.
 *
 * ESLint disable note: require-success-tests-for-error-tests is disabled because
 * this is a proxy API test, not a CRUD endpoint. Authentication/validation tests
 * don't require the same data structure validations that endpoint tests do.
 */

const { sentryKey: SENTRY_KEY, projectId: PROJECT_ID } = getSentryConfig();

// Intentionally invalid key for testing error cases
const INVALID_SENTRY_KEY = 'invalid-key-12345';

test.describe('Sentry/Bugsink Authentication', () => {
  test('accepts request with valid auth header', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
      },
      data: {
        event_id: eventId,
        message: 'Test with valid auth',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.text();
    expect(responseBody).toBeDefined();
  });

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

    expect(response.status()).toBe(403);
  });

  test('rejects request with invalid sentry key', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(INVALID_SENTRY_KEY),
      },
      data: {
        event_id: eventId,
        message: 'Test with invalid key',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });

    expect(response.status()).toBe(400);
  });

  test('rejects request to non-existent project', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post('/sentry/api/99999/store/', {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
      },
      data: {
        event_id: eventId,
        message: 'Test with invalid project',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });

    expect(response.status()).toBe(403);
  });
});
