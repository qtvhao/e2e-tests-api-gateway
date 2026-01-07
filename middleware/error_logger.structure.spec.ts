/**
 * @fileoverview Error Logger Middleware - Log Entry Structure Tests
 *
 * Tests for validating log entry fields and formats.
 *
 * @version 1.0.0
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Related files:
 * - error_logger.spec.ts (INDEX)
 * - error_logger.endpoint.spec.ts
 * - error_logger.4xx.spec.ts
 * - error_logger.behavior.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  getErrorLoggerConfig,
  waitForLogEntry,
} from './helpers/error-logger-helpers';

// NOTE: Tests use unique paths and waitForLogEntry, so no log clearing needed
// This allows parallel execution across test files

test.describe('Error Logger Middleware - Log Entry Structure Tests', () => {
  // Force sequential execution to avoid race conditions with error logs endpoint
  test.describe.configure({ mode: 'serial' });

  const { API_BASE_URL, ERROR_LOGS_ENDPOINT } = getErrorLoggerConfig();

  test('log entries contain all required fields', async ({ request }) => {
    // Trigger an error with unique path for this test
    const testPath = `/api/v1/system-integration/test-fields-${Date.now()}`;
    await request.get(`${API_BASE_URL}${testPath}`);

    // Wait for log to be written
    const matchedLogs = await waitForLogEntry(
      request,
      ERROR_LOGS_ENDPOINT,
      (log: Record<string, unknown>) => log.path === testPath
    );
    expect(matchedLogs.length).toBeGreaterThan(0);
    const entry = matchedLogs[0];

    // Required fields
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('method');
    expect(entry).toHaveProperty('path');
    expect(entry).toHaveProperty('status');
    expect(entry).toHaveProperty('client_ip');
    expect(entry).toHaveProperty('latency');

    // Validate field types
    expect(typeof entry.timestamp).toBe('string');
    expect(typeof entry.method).toBe('string');
    expect(typeof entry.path).toBe('string');
    expect(typeof entry.status).toBe('number');
    expect(typeof entry.client_ip).toBe('string');
    expect(typeof entry.latency).toBe('string');
  });

  test('timestamp is in RFC3339 format', async ({ request }) => {
    // Trigger an error with unique path for this test
    const testPath = `/api/v1/system-integration/test-timestamp-${Date.now()}`;
    await request.get(`${API_BASE_URL}${testPath}`);

    // Wait for log to be written
    const matchedLogs = await waitForLogEntry(
      request,
      ERROR_LOGS_ENDPOINT,
      (log: Record<string, unknown>) => log.path === testPath
    );
    expect(matchedLogs.length).toBeGreaterThan(0);
    const entry = matchedLogs[0];

    // RFC3339 format: 2024-01-15T10:30:00Z
    const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    expect(entry.timestamp).toMatch(rfc3339Regex);
  });
});
