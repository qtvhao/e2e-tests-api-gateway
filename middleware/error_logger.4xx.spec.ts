/**
 * @fileoverview Error Logger Middleware - 4xx Response Tests
 *
 * Tests for logging 4xx HTTP error responses.
 *
 * @version 1.0.0
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Related files:
 * - error_logger.spec.ts (INDEX)
 * - error_logger.endpoint.spec.ts
 * - error_logger.structure.spec.ts
 * - error_logger.behavior.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  getErrorLoggerConfig,
  waitForLogEntry,
  INVALID_TEST_TOKEN,
} from './helpers/error-logger-helpers';

// NOTE: Tests use unique paths and waitForLogEntry, so no log clearing needed
// This allows parallel execution across test files

test.describe('Error Logger Middleware - 4xx Response Tests', () => {
  const { API_BASE_URL, ERROR_LOGS_ENDPOINT } = getErrorLoggerConfig();

  test('logs 404 Not Found errors', async ({ request }) => {
    // Use unique path to avoid conflicts with parallel tests
    const errorPath = '/api/v1/system-integration/404-test-' + Date.now();
    await request.get(`${API_BASE_URL}${errorPath}`);

    // Wait for log to be written and check error log
    const matchedLogs = await waitForLogEntry(
      request,
      ERROR_LOGS_ENDPOINT,
      (log: Record<string, unknown>) =>
        log.status === 404 && log.path === errorPath
    );
    expect(matchedLogs.length).toBeGreaterThan(0);

    const matchedLog = matchedLogs[0];
    expect(matchedLog.method).toBe('GET');
  });

  test('logs 401 Unauthorized errors', async ({ request }) => {
    // Try to access a protected endpoint with an invalid JWT token
    const protectedPath = '/api/v1/auth/me';
    await request.get(`${API_BASE_URL}${protectedPath}`, {
      headers: {
        Authorization: `Bearer ${INVALID_TEST_TOKEN}`
      }
    });

    // Wait for log to be written and check error log
    const matchedLogs = await waitForLogEntry(
      request,
      ERROR_LOGS_ENDPOINT,
      (log: Record<string, unknown>) =>
        log.status === 401 && log.path === protectedPath
    );
    expect(matchedLogs.length).toBeGreaterThan(0);
  });

  test('logs 400 Bad Request errors', async ({ request }) => {
    // Send malformed JSON to login endpoint
    const loginPath = '/api/v1/auth/login';
    await request.post(`${API_BASE_URL}${loginPath}`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'invalid json {'
    });

    // Wait for log to be written and check error log
    const matchedLogs = await waitForLogEntry(
      request,
      ERROR_LOGS_ENDPOINT,
      (log: Record<string, unknown>) =>
        log.status === 400 && log.path === loginPath
    );
    expect(matchedLogs.length).toBeGreaterThan(0);
  });
});
