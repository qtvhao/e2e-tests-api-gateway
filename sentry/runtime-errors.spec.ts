/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/envelope/, not our versioned REST API */
/* eslint-disable playwright-custom/no-process-env-in-spec -- Fallback to process.env for environments without .env file */
import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders } from '../helpers/sentry-test-utils';

/**
 * Sentry SDK - Runtime Exception Tests
 * Tests TypeError and ReferenceError capturing
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY || '';
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID || '1';

test.describe('Sentry SDK - TypeError / Runtime Exceptions', () => {
  // Force sequential execution to avoid race conditions with Sentry endpoint
  test.describe.configure({ mode: 'serial', retries: 1 });

  test('captures TypeError from undefined property access', async ({ request }) => {
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
        message: "Cannot read properties of undefined (reading 'value')",
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'ErrorTestPage',
        exception: {
          values: [
            {
              type: 'TypeError',
              value: "Cannot read properties of undefined (reading 'value')",
              stacktrace: {
                frames: [
                  {
                    filename: 'web/app/src/pages/ErrorTestPage.tsx',
                    function: 'triggerTypeError',
                    lineno: 80,
                    colno: 30,
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        tags: {
          module: 'ErrorTestPage',
          action: 'type_error',
          error_type: 'TypeError',
        },
        extra: {
          triggered_by: 'Trigger TypeError button',
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

  test('captures ReferenceError', async ({ request }) => {
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
        message: 'undefinedVariable is not defined',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'ErrorTestPage',
        exception: {
          values: [
            {
              type: 'ReferenceError',
              value: 'undefinedVariable is not defined',
              stacktrace: {
                frames: [
                  {
                    filename: 'web/app/src/pages/ErrorTestPage.tsx',
                    function: 'triggerReferenceError',
                    lineno: 95,
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
          action: 'reference_error',
          error_type: 'ReferenceError',
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
