/**
 * @fileoverview Error Logger Middleware - Endpoint Tests
 *
 * Tests for the error log API endpoints (GET and DELETE).
 *
 * @version 1.0.0
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Related files:
 * - error_logger.spec.ts (INDEX)
 * - error_logger.4xx.spec.ts
 * - error_logger.structure.spec.ts
 * - error_logger.behavior.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  getErrorLoggerConfig,
  waitForLogEntry,
} from './helpers/error-logger-helpers';

// NOTE: These tests use unique paths so they can run in parallel with other test files

test.describe('Error Logger Middleware - Endpoint Tests', () => {
  // Force sequential execution to avoid race conditions with error logs endpoint
  test.describe.configure({ mode: 'serial' });

  const { API_BASE_URL, ERROR_LOGS_ENDPOINT } = getErrorLoggerConfig();

  test('GET /api/v1/admin/error-logs returns JSON array', async ({ request }) => {
    const response = await request.get(ERROR_LOGS_ENDPOINT);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const logs = await response.json();
    expect(Array.isArray(logs)).toBe(true);
  });

  test('DELETE /api/v1/admin/error-logs clears the log', async ({ request }) => {
    // Use a unique marker path to identify our test error
    const markerPath = '/api/v1/system-integration/clear-test-marker-' + Date.now();

    // First trigger an error with our marker path
    await request.get(`${API_BASE_URL}${markerPath}`);

    // Wait for error to be logged (use polling since logging may be async)
    const markedLogs = await waitForLogEntry(
      request,
      ERROR_LOGS_ENDPOINT,
      (log: Record<string, unknown>) => log.path === markerPath
    );
    expect(markedLogs.length).toBeGreaterThan(0);

    // Clear logs
    const clearResponse = await request.delete(ERROR_LOGS_ENDPOINT);
    expect(clearResponse.status()).toBe(200);
    const body = await clearResponse.json();
    expect(body.message).toBe('Error logs cleared');

    // Verify our marker error is no longer present
    const verifyResponse = await request.get(ERROR_LOGS_ENDPOINT);
    expect(verifyResponse.status()).toBe(200);
    const logsAfterClear = await verifyResponse.json();
    const markedLogsAfterClear = logsAfterClear.filter(
      (log: { path: string }) => log.path === markerPath
    );
    expect(markedLogsAfterClear.length).toBe(0);
  });
});
