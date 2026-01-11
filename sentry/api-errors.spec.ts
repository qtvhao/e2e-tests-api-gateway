/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/envelope/, not our versioned REST API. Also, /api/non-existent-endpoint is intentionally unversioned for error testing. */
/* eslint-disable playwright-custom/no-process-env-in-spec -- Fallback to process.env for environments without .env file */
import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders } from '../helpers/sentry-test-utils';

/**
 * Sentry SDK - API Error Tracking Tests
 * Tests API error and network failure capturing
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY || '';
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID || '1';

test.describe('Sentry SDK - API Error Tracking', () => {
  // Force sequential execution to avoid race conditions with Sentry endpoint
  test.describe.configure({ mode: 'serial', retries: 1 });

  test('captures 404 API error', async ({ request }) => {
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
        message: 'API Error: 404 Not Found',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'ErrorTestPage',
        tags: {
          module: 'ErrorTestPage',
          action: 'api_call',
          status_code: '404',
        },
        extra: {
          endpoint: '/api/non-existent-endpoint',
          method: 'GET',
          status: 404,
          triggered_by: 'Trigger API Error button',
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

  test('captures network failure error', async ({ request }) => {
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
        message: 'Failed to fetch: Network error',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'ErrorTestPage',
        exception: {
          values: [
            {
              type: 'TypeError',
              value: 'Failed to fetch',
              stacktrace: {
                frames: [
                  {
                    filename: 'web/app/src/pages/ErrorTestPage.tsx',
                    function: 'triggerApiError',
                    lineno: 55,
                    colno: 29,
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        tags: {
          module: 'ErrorTestPage',
          action: 'api_call',
          error_type: 'NetworkError',
        },
        extra: {
          endpoint: '/api/non-existent-endpoint',
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
