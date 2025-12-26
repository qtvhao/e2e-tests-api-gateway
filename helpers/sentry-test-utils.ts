import * as fs from 'fs';
import * as path from 'path';

/**
 * Sentry E2E Test Utilities
 *
 * Shared utilities for Sentry SDK integration tests:
 * - Environment configuration loading
 * - Event ID generation
 * - Sentry authentication headers
 */

/**
 * Load environment variables from root .env file
 */
export function loadEnvConfig(): Record<string, string> {
  const envPath = path.resolve(__dirname, '../../../../../.env');
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

  return envVars;
}

/**
 * Generate a valid 32-character hex event ID for Sentry
 */
export function generateEventId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Get Sentry authentication header
 */
export function getSentryAuthHeader(sentryKey: string): string {
  return `Sentry sentry_key=${sentryKey},sentry_version=7,sentry_client=sentry.javascript.react/8.45.0`;
}

/**
 * Create Sentry envelope format with header and event data
 */
export function createEnvelope(eventData: Record<string, unknown>, sentryKey: string, projectId: string): string {
  const eventId = generateEventId();
  const now = new Date().toISOString();

  const envelope = [
    JSON.stringify({
      event_id: eventId,
      sent_at: now,
      dsn: `http://${sentryKey}@localhost:8080/sentry/${projectId}`,
    }),
    JSON.stringify({ type: 'event', content_type: 'application/json' }),
    JSON.stringify({
      event_id: eventId,
      platform: 'javascript',
      timestamp: Math.floor(Date.now() / 1000),
      sdk: { name: 'sentry.javascript.react', version: '8.45.0' },
      ...eventData,
    }),
  ].join('\n');

  return envelope;
}

/**
 * Get common Sentry request headers
 */
export function getSentryRequestHeaders(sentryKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/x-sentry-envelope',
    'X-Sentry-Auth': getSentryAuthHeader(sentryKey),
  };
}
