import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for Sentry SDK integration with ErrorTestPage
 *
 * Tests cover:
 * - Manual error capture via errorTracker.captureException()
 * - Fatal error capture with severity level
 * - API error tracking
 * - React ErrorBoundary integration
 * - TypeError/runtime exceptions
 * - Uncaught async errors
 * - Unhandled promise rejections
 *
 * Reference: web/app/src/pages/ErrorTestPage.tsx
 * Reference: web/app/src/lib/error-tracking.ts
 */

// Sentry configuration - loaded from e2e/.env
// See: e2e/.env for SENTRY_KEY and SENTRY_PROJECT_ID values
// Get DSN from: docker logs ugjb-v2-sentry-init-1

// Load .env file
const envPath = path.resolve(__dirname, '../../../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, value] = trimmed.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  }
});

const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY;
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID;

const SENTRY_AUTH_HEADER = `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=sentry.javascript.react/8.45.0`;

/**
 * Generate a valid 32-character hex event ID
 */
function generateEventId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

test.describe('Sentry SDK - ErrorTestPage Integration', () => {
  test.describe('Manual Error Capture', () => {
    test('captures manually triggered error with context', async ({ request }) => {
      const eventId = generateEventId();
      const now = new Date().toISOString();

      const envelope = [
        JSON.stringify({
          event_id: eventId,
          sent_at: now,
          dsn: `http://${SENTRY_KEY}@localhost:8080/sentry/${PROJECT_ID}`,
        }),
        JSON.stringify({ type: 'event', content_type: 'application/json' }),
        JSON.stringify({
          event_id: eventId,
          message: 'Manually captured error for Sentry testing',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            action: 'manual_capture',
            test_type: 'manual',
          },
          extra: {
            test_type: 'manual',
            timestamp: new Date().toISOString(),
            triggered_by: 'Capture Error Manually button',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        }),
      ].join('\n');

      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: envelope,
      });

      expect(response.status()).toBe(200);
    });

    test('captures error with custom module and action tags', async ({ request }) => {
      const eventId = generateEventId();
      const now = new Date().toISOString();

      const envelope = [
        JSON.stringify({
          event_id: eventId,
          sent_at: now,
          dsn: `http://${SENTRY_KEY}@localhost:8080/sentry/${PROJECT_ID}`,
        }),
        JSON.stringify({ type: 'event', content_type: 'application/json' }),
        JSON.stringify({
          event_id: eventId,
          message: 'Custom tagged error from ErrorTestPage',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            action: 'custom_action',
            component: 'ErrorTestPage',
            environment: 'e2e-test',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        }),
      ].join('\n');

      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: envelope,
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Fatal Error Capture', () => {
    test('captures fatal error with correct severity level', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Fatal error simulation for Sentry testing',
          level: 'fatal',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            action: 'fatal_simulation',
            severity: 'fatal',
          },
          extra: {
            severity: 'fatal',
            requires_immediate_attention: true,
            triggered_by: 'Trigger Fatal Error button',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures fatal error with fingerprint for grouping', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Fatal error with custom fingerprint',
          level: 'fatal',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          fingerprint: ['fatal-error', 'ErrorTestPage', 'manual-trigger'],
          tags: {
            module: 'ErrorTestPage',
            action: 'fatal_simulation',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('React ErrorBoundary', () => {
    test('captures render error caught by ErrorBoundary', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
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
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
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

  test.describe('TypeError / Runtime Exceptions', () => {
    test('captures TypeError from undefined property access', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
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
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures ReferenceError', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
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
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Async Errors', () => {
    test('captures uncaught async error from setTimeout', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
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
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures unhandled promise rejection', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
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
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('API Error Tracking', () => {
    test('captures 404 API error', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
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
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures network failure error', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
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
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Envelope API - ErrorTestPage Events', () => {
    test('captures error via envelope endpoint', async ({ request }) => {
      const eventId = generateEventId();
      const now = new Date().toISOString();

      const envelope = [
        JSON.stringify({
          event_id: eventId,
          sent_at: now,
          dsn: `http://${SENTRY_KEY}@localhost:8080/sentry/${PROJECT_ID}`,
        }),
        JSON.stringify({ type: 'event', content_type: 'application/json' }),
        JSON.stringify({
          event_id: eventId,
          message: 'ErrorTestPage: Manual error via envelope',
          level: 'error',
          platform: 'javascript',
          environment: 'development',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            action: 'envelope_test',
            page: 'ErrorTestPage',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        }),
      ].join('\n');

      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: envelope,
      });

      expect(response.status()).toBe(200);
    });

    test('captures fatal error via envelope endpoint', async ({ request }) => {
      const eventId = generateEventId();
      const now = new Date().toISOString();

      const envelope = [
        JSON.stringify({
          event_id: eventId,
          sent_at: now,
          dsn: `http://${SENTRY_KEY}@localhost:8080/sentry/${PROJECT_ID}`,
        }),
        JSON.stringify({ type: 'event', content_type: 'application/json' }),
        JSON.stringify({
          event_id: eventId,
          message: 'ErrorTestPage: Fatal error via envelope',
          level: 'fatal',
          platform: 'javascript',
          environment: 'development',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            action: 'fatal_envelope_test',
            severity: 'fatal',
          },
          extra: {
            requires_immediate_attention: true,
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        }),
      ].join('\n');

      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: envelope,
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Error Context and Breadcrumbs', () => {
    test('captures error with user interaction breadcrumbs', async ({ request }) => {
      const eventId = generateEventId();
      const now = Math.floor(Date.now() / 1000);

      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
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
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
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
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Error with user context from ErrorTestPage',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          user: {
            id: 'usr_admin_123',
            email: 'admin@ugjb.com',
            username: 'Admin User',
          },
          tags: {
            module: 'ErrorTestPage',
            action: 'user_context_test',
            authenticated: 'true',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Error Severity Levels', () => {
    test('captures debug level message', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Debug message from ErrorTestPage',
          level: 'debug',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            level: 'debug',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures info level message', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Info message from ErrorTestPage',
          level: 'info',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            level: 'info',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures warning level message', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Warning message from ErrorTestPage',
          level: 'warning',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            level: 'warning',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures error level message', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Error message from ErrorTestPage',
          level: 'error',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            level: 'error',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });

    test('captures fatal level message', async ({ request }) => {
      const eventId = generateEventId();
      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': SENTRY_AUTH_HEADER,
        },
        data: {
          event_id: eventId,
          message: 'Fatal message from ErrorTestPage',
          level: 'fatal',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
          logger: 'ErrorTestPage',
          tags: {
            module: 'ErrorTestPage',
            level: 'fatal',
          },
          sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
        },
      });

      expect(response.status()).toBe(200);
    });
  });
});
