/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/store/, not our versioned REST API */
import { test, expect } from '@playwright/test';
import { getSentryConfig, generateEventId, getSentryAuthHeader } from '../helpers/sentry-test-utils';

/**
 * E2E tests for Sentry/Bugsink Event Context
 *
 * Tests cover:
 * - User context inclusion
 * - Tags metadata
 * - Breadcrumbs for event tracing
 * - Extra context data
 *
 * Note: Bugsink service must be running for these tests to pass.
 */

const { sentryKey: SENTRY_KEY, projectId: PROJECT_ID } = getSentryConfig();

test.describe('Sentry/Bugsink Event Context', () => {
  test('accepts event with user context', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
        'X-Sentry-Auth': getSentryAuthHeader(SENTRY_KEY),
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
