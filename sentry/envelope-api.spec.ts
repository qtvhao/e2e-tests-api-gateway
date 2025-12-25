import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders, createEnvelope } from '../helpers/sentry-test-utils';

/**
 * Sentry SDK - Envelope API Tests
 * Tests Sentry envelope format and endpoint
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY;
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID;

test.describe('Sentry SDK - Envelope API - ErrorTestPage Events', () => {
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
      headers: getSentryRequestHeaders(SENTRY_KEY),
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
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });
});
