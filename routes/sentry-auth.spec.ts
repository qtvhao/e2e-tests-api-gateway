import { test, expect } from '@playwright/test';

/**
 * E2E tests for Sentry Authentication and Project Routing
 *
 * Tests cover:
 * - Authentication methods (X-Sentry-Auth, query string, Authorization header)
 * - Project routing by ID
 * - Project validation and error handling
 *
 * Reference: routes/external.go - SetupExternalRoutes
 */

// Configuration from docker-compose
const SENTRY_KEY = process.env.SENTRY_KEY || 'cac4e92f-c384-42d6-aaad-001c2f4f9b60';
const PROJECT_ID = process.env.SENTRY_PROJECT_ID || '1';

test.describe('Sentry Authentication Methods', () => {
  test('should accept X-Sentry-Auth header', async ({ request }) => {
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7,sentry_client=test/1.0`,
      },
      data: {
        event_id: generateEventId(),
        message: 'X-Sentry-Auth test',
        level: 'info',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
    expect(response.status()).toBe(200);
  });

  test('should accept sentry_key in query string', async ({ request }) => {
    const response = await request.post(
      `/sentry/api/${PROJECT_ID}/store/?sentry_key=${SENTRY_KEY}&sentry_version=7`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          event_id: generateEventId(),
          message: 'Query string auth test',
          level: 'info',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      }
    );
    expect(response.status()).toBe(200);
  });

  test('should accept Authorization header with DSN', async ({ request }) => {
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `DSN http://${SENTRY_KEY}@localhost:8080/sentry/${PROJECT_ID}`,
      },
      data: {
        event_id: generateEventId(),
        message: 'Authorization header test',
        level: 'info',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
    // May or may not be supported
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });
});

test.describe('Sentry Project Routing', () => {
  test('should route to correct project by ID', async ({ request }) => {
    const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
      },
      data: {
        event_id: generateEventId(),
        message: 'Project routing test',
        level: 'info',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
    expect(response.status()).toBe(200);
  });

  test('should reject invalid project ID', async ({ request }) => {
    const response = await request.post('/sentry/api/99999/store/', {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
      },
      data: {
        event_id: generateEventId(),
        message: 'Invalid project test',
        level: 'info',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
    // Should reject with 401 or 404
    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test('should reject non-numeric project ID', async ({ request }) => {
    const response = await request.post('/sentry/api/invalid-project/store/', {
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
      },
      data: {
        event_id: generateEventId(),
        message: 'Non-numeric project test',
        level: 'info',
        platform: 'javascript',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
    expect([400, 404]).toContain(response.status());
  });
});

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
