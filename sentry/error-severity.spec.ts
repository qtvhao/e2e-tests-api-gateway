/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/envelope/, not our versioned REST API */
/* eslint-disable playwright-custom/no-process-env-in-spec -- Fallback to process.env for environments without .env file */
import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders } from '../helpers/sentry-test-utils';

/**
 * Sentry SDK - Error Severity Level Tests
 * Tests different error severity levels: debug, info, warning, error, fatal
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY || '';
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID || '1';

test.describe('Sentry SDK - Error Severity Levels', () => {
  // Force sequential execution to avoid race conditions with Sentry endpoint
  test.describe.configure({ mode: 'serial', retries: 1 });

  test('captures debug level message', async ({ request }) => {
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
      }),
    ].join('\n');

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });

  test('captures info level message', async ({ request }) => {
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
      }),
    ].join('\n');

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });

  test('captures warning level message', async ({ request }) => {
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
      }),
    ].join('\n');

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });

  test('captures error level message', async ({ request }) => {
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
      }),
    ].join('\n');

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });

  test('captures fatal level message', async ({ request }) => {
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
      }),
    ].join('\n');

    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
      data: envelope,
    });

    expect(response.status()).toBe(200);
  });
});
