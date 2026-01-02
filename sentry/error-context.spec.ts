/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/envelope/, not our versioned REST API */
import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders } from '../helpers/sentry-test-utils';
import { ADMIN_CREDENTIALS } from '../helpers/auth';

/**
 * Sentry SDK - Error Context and Breadcrumbs Tests
 * Tests error context and breadcrumb tracking
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY;
const PROJECT_ID = envVars.SENTRY_PROJECT_ID;

test.describe('Sentry SDK - Error Context and Breadcrumbs', () => {
  test('captures error with user interaction breadcrumbs', async ({ request }) => {
    const eventId = generateEventId();
    const now = Math.floor(Date.now() / 1000);

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: {
        event_id: eventId,
        message: 'Error triggered from ErrorTestPage',
        level: 'error',
        platform: 'javascript',
        timestamp: now,
        logger: 'ErrorTestPage',
        breadcrumbs: {
          values: [
            {
              timestamp: now - 30,
              category: 'navigation',
              message: 'User navigated to /error-test',
              level: 'info',
              data: { from: '/', to: '/error-test' },
            },
            {
              timestamp: now - 10,
              category: 'ui.click',
              message: 'User clicked "Trigger Fatal Error" button',
              level: 'info',
              data: { element: 'button', text: 'Trigger Fatal Error' },
            },
            {
              timestamp: now - 5,
              category: 'console',
              message: '[ErrorTracker] FATAL: Fatal error simulation',
              level: 'error',
            },
          ],
        },
        tags: {
          module: 'ErrorTestPage',
          action: 'user_triggered',
          page: 'ErrorTestPage',
        },
        sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      },
    });

    expect(response.status()).toBe(200);
  });

  test('captures error with device and browser context', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: {
        event_id: eventId,
        message: 'Error with device context from ErrorTestPage',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'ErrorTestPage',
        contexts: {
          browser: {
            name: 'Chrome',
            version: '120.0.0',
          },
          os: {
            name: 'macOS',
            version: '14.0',
          },
          device: {
            family: 'Desktop',
            screen_resolution: '1920x1080',
          },
        },
        tags: {
          module: 'ErrorTestPage',
          action: 'context_test',
        },
        sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      },
    });

    expect(response.status()).toBe(200);
  });

  test('captures error with user context', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: {
        event_id: eventId,
        message: 'Error with user context from ErrorTestPage',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'ErrorTestPage',
        user: {
          id: 'usr_admin_123',
          email: ADMIN_CREDENTIALS.email,
          username: 'Admin User',
        },
        tags: {
          module: 'ErrorTestPage',
          action: 'user_context_test',
          is_logged_in: 'true',
        },
        sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      },
    });

    expect(response.status()).toBe(200);
  });
});
