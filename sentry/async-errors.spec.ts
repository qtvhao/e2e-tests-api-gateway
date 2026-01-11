/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/envelope/, not our versioned REST API */
/* eslint-disable playwright-custom/no-process-env-in-spec -- Fallback to process.env for environments without .env file */
import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders } from '../helpers/sentry-test-utils';

/**
 * Sentry SDK - Async Error Tests
 * Tests uncaught async errors and promise rejections
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY || '';
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID || '1';

test.describe('Sentry SDK - Async Errors', () => {
  // Force sequential execution to avoid race conditions with Sentry endpoint
  test.describe.configure({ mode: 'serial', retries: 1 });

  test('captures uncaught async error from setTimeout', async ({ request }) => {
    const eventId = generateEventId();
    const sentAt = new Date().toISOString();

    const envelope = [
      JSON.stringify({
        event_id: eventId,
        sent_at: sentAt,
        dsn: `http://${SENTRY_KEY}@localhost:8080/sentry/${PROJECT_ID}`,
      }),
      JSON.stringify({ type: 'event', content_type: 'application/json' }),
      JSON.stringify({
        event_id: eventId,
        message: 'Uncaught async error for Sentry testing',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'window.onerror',
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Uncaught async error for Sentry testing',
              mechanism: {
                type: 'onerror',
                handled: false,
              },
              stacktrace: {
                frames: [
                  {
                    filename: 'web/app/src/pages/ErrorTestPage.tsx',
                    function: 'anonymous',
                    lineno: 20,
                    colno: 7,
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        tags: {
          module: 'ErrorTestPage',
          action: 'async_error',
          mechanism: 'onerror',
        },
        extra: {
          triggered_by: 'Trigger Uncaught Error button',
          async_context: 'setTimeout callback',
        },
        sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      }),
    ].join('\n');

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });

  test('captures unhandled promise rejection', async ({ request }) => {
    const eventId = generateEventId();
    const sentAt = new Date().toISOString();

    const envelope = [
      JSON.stringify({
        event_id: eventId,
        sent_at: sentAt,
        dsn: `http://${SENTRY_KEY}@localhost:8080/sentry/${PROJECT_ID}`,
      }),
      JSON.stringify({ type: 'event', content_type: 'application/json' }),
      JSON.stringify({
        event_id: eventId,
        message: 'Unhandled promise rejection for Sentry testing',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'window.onunhandledrejection',
        exception: {
          values: [
            {
              type: 'UnhandledRejection',
              value: 'Unhandled promise rejection for Sentry testing',
              mechanism: {
                type: 'onunhandledrejection',
                handled: false,
              },
              stacktrace: {
                frames: [
                  {
                    filename: 'web/app/src/pages/ErrorTestPage.tsx',
                    function: 'triggerPromiseRejection',
                    lineno: 26,
                    colno: 5,
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        tags: {
          module: 'ErrorTestPage',
          action: 'promise_rejection',
          mechanism: 'onunhandledrejection',
        },
        extra: {
          triggered_by: 'Trigger Promise Rejection button',
        },
        sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      }),
    ].join('\n');

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });
});
