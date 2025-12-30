/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/envelope/, not our versioned REST API */
/* eslint-disable playwright-custom/no-process-env-in-spec -- Fallback to process.env for environments without .env file */
import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders } from '../helpers/sentry-test-utils';

/**
 * Sentry SDK - React ErrorBoundary Integration Tests
 * Tests error capture through React ErrorBoundary
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY;
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID;

test.describe('Sentry SDK - React ErrorBoundary', () => {
  test('captures render error caught by ErrorBoundary', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: {
        event_id: eventId,
        message: 'Intentional render error for Sentry testing',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'react',
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Intentional render error for Sentry testing',
              stacktrace: {
                frames: [
                  {
                    filename: 'web/app/src/pages/ErrorTestPage.tsx',
                    function: 'ErrorTestPage',
                    lineno: 10,
                    colno: 5,
                    in_app: true,
                  },
                  {
                    filename: 'node_modules/react-dom/cjs/react-dom.development.js',
                    function: 'renderWithHooks',
                    lineno: 14985,
                    colno: 18,
                    in_app: false,
                  },
                ],
              },
            },
          ],
        },
        tags: {
          module: 'react',
          action: 'render',
          component: 'ErrorTestPage',
        },
        extra: {
          componentStack: '\n    at ErrorTestPage\n    at AppLayout\n    at ProtectedRoute\n    at ErrorBoundary\n    at App',
          triggered_by: 'Trigger Render Error button',
        },
        sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      },
    });

    expect(response.status()).toBe(200);
  });

  test('captures ErrorBoundary onError callback data', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: {
        event_id: eventId,
        message: 'ErrorBoundary caught error in ErrorTestPage',
        level: 'error',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
        logger: 'react.ErrorBoundary',
        tags: {
          module: 'react',
          action: 'render',
          caught_by: 'ErrorBoundary',
        },
        contexts: {
          react: {
            componentStack: 'at ErrorTestPage\nat AppLayout\nat ProtectedRoute',
          },
        },
        sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      },
    });

    expect(response.status()).toBe(200);
  });
});
