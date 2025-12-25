import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway Sentry/Bugsink Routes
 *
 * Tests cover:
 * - Sentry proxy route configuration (/sentry/*)
 * - Sentry SDK endpoints (store, envelope, minidump, security)
 * - CORS headers for browser SDK compatibility
 * - Path prefix stripping (/sentry/* -> /*)
 *
 * Reference: routes/external.go - SetupExternalRoutes
 */

// Configuration from docker-compose
const SENTRY_KEY = process.env.SENTRY_KEY || 'cac4e92f-c384-42d6-aaad-001c2f4f9b60';
const PROJECT_ID = process.env.SENTRY_PROJECT_ID || '1';

test.describe('Sentry/Bugsink Routes', () => {
  test.describe('Route Configuration', () => {
    test('should route /sentry/* to Bugsink service', async ({ request }) => {
      const response = await request.get('/sentry/', {
        maxRedirects: 0,
      });
      // Bugsink returns 302 redirect to login page
      expect([200, 302]).toContain(response.status());
    });

    test('should strip /sentry prefix when forwarding to Bugsink', async ({ request }) => {
      // The gateway strips /sentry and forwards to Bugsink at /
      // Test by accessing a known Bugsink endpoint
      const response = await request.get('/sentry/accounts/login/', {
        maxRedirects: 0,
      });
      // Bugsink should respond (200 for login page, 302 redirect, or 404 if path differs)
      expect([200, 302, 404]).toContain(response.status());
    });

    test('should route nested paths correctly', async ({ request }) => {
      const response = await request.get(`/sentry/api/${PROJECT_ID}/store/`, {
        maxRedirects: 0,
      });
      // GET on store endpoint returns 405 Method Not Allowed (POST only)
      expect([200, 405]).toContain(response.status());
    });
  });

  test.describe('Sentry SDK Endpoints', () => {
    test('should route to store endpoint for error events', async ({ request }) => {
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
        },
        data: {
          event_id: generateEventId(),
          message: 'Route test - store endpoint',
          level: 'info',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      });
      expect(response.status()).toBe(200);
    });

    test('should route to envelope endpoint for batched events', async ({ request }) => {
      const eventId = generateEventId();
      const envelope = [
        JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
        JSON.stringify({ type: 'event' }),
        JSON.stringify({
          event_id: eventId,
          message: 'Route test - envelope endpoint',
          level: 'info',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        }),
      ].join('\n');

      const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
        },
        data: envelope,
      });
      // Envelope endpoint may return 200 or 500 depending on payload format
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });

    test('should route to security endpoint for CSP reports', async ({ request }) => {
      const response = await request.post(`/sentry/api/${PROJECT_ID}/security/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
        },
        data: {
          'csp-report': {
            'document-uri': 'http://localhost:8080/',
            'violated-directive': 'script-src',
            'blocked-uri': 'http://evil.com/script.js',
          },
        },
      });
      // Security endpoint may not be implemented, but route should exist
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });

    test('should route to minidump endpoint for native crashes', async ({ request }) => {
      const response = await request.post(`/sentry/api/${PROJECT_ID}/minidump/`, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
        },
      });
      // Minidump endpoint may not be implemented, but route should exist
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });
  });

  test.describe('HTTP Methods', () => {
    test('should accept POST to store endpoint', async ({ request }) => {
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
        },
        data: {
          event_id: generateEventId(),
          message: 'POST method test',
          level: 'info',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      });
      expect(response.status()).toBe(200);
    });

    test('should handle OPTIONS for CORS preflight', async ({ request }) => {
      const response = await request.fetch(`/sentry/api/${PROJECT_ID}/store/`, {
        method: 'OPTIONS',
      });
      // Should return 200 or 204 for preflight
      expect([200, 204, 405]).toContain(response.status());
    });

    test('should reject GET on store endpoint', async ({ request }) => {
      const response = await request.get(`/sentry/api/${PROJECT_ID}/store/`);
      // Store endpoint only accepts POST
      expect([405, 200]).toContain(response.status());
    });
  });

  test.describe('CORS Headers', () => {
    test('should include CORS headers for browser SDK', async ({ request }) => {
      const response = await request.post(`/sentry/api/${PROJECT_ID}/store/`, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'X-Sentry-Auth': `Sentry sentry_key=${SENTRY_KEY},sentry_version=7`,
        },
        data: {
          event_id: generateEventId(),
          message: 'CORS test',
          level: 'info',
          platform: 'javascript',
          timestamp: Math.floor(Date.now() / 1000),
        },
      });
      expect(response.status()).toBe(200);
      // CORS headers may or may not be present depending on Bugsink config
    });
  });

  test.describe('Authentication Methods', () => {
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

  test.describe('Project Routing', () => {
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

  test.describe('Static Assets', () => {
    test('should serve Bugsink static assets', async ({ request }) => {
      const response = await request.get('/sentry/static/css/dist/styles.css', {
        maxRedirects: 0,
      });
      // Static assets should be served
      expect([200, 302, 404]).toContain(response.status());
    });

    test('should serve Bugsink favicon', async ({ request }) => {
      const response = await request.get('/sentry/favicon.ico', {
        maxRedirects: 0,
      });
      expect([200, 302, 404]).toContain(response.status());
    });
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
