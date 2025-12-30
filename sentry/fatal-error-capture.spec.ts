/* eslint-disable playwright-custom/no-unversioned-api -- Sentry/Bugsink uses its own API format /sentry/api/{project_id}/envelope/, not our versioned REST API */
/* eslint-disable playwright-custom/no-process-env-in-spec -- Fallback to process.env for environments without .env file */
import { test, expect } from '@playwright/test';
import { loadEnvConfig, generateEventId, getSentryRequestHeaders } from '../helpers/sentry-test-utils';

/**
 * Sentry SDK - Fatal Error Capture Tests
 * Tests fatal error capturing with severity levels and fingerprinting
 */

const envVars = loadEnvConfig();
const SENTRY_KEY = envVars.SENTRY_KEY || process.env.SENTRY_KEY;
const PROJECT_ID = envVars.SENTRY_PROJECT_ID || process.env.SENTRY_PROJECT_ID;

test.describe('Sentry SDK - Fatal Error Capture', () => {
  test('captures fatal error with correct severity level', async ({ request }) => {
    const eventId = generateEventId();
    const response = await request.post(`/sentry/api/${PROJECT_ID}/envelope/`, {
      headers: getSentryRequestHeaders(SENTRY_KEY),
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
      headers: getSentryRequestHeaders(SENTRY_KEY),
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
