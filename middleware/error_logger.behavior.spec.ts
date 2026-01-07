/**
 * @fileoverview Error Logger Middleware - Behavior Tests
 *
 * Tests for error logging behavior: 2xx exclusion, accumulation, query params, HTTP methods.
 *
 * @version 1.0.0
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Related files:
 * - error_logger.spec.ts (INDEX)
 * - error_logger.endpoint.spec.ts
 * - error_logger.4xx.spec.ts
 * - error_logger.structure.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  getErrorLoggerConfig,
  clearErrorLogs,
  waitForLogEntry,
} from './helpers/error-logger-helpers';

// NOTE: Tests use unique paths and waitForLogEntry, so no global log clearing needed
// This allows parallel execution across test files

test.describe('Error Logger Middleware - Behavior Tests', () => {
  // Force sequential execution to avoid race conditions with error logs endpoint
  test.describe.configure({ mode: 'serial' });

  const { API_BASE_URL, ERROR_LOGS_ENDPOINT } = getErrorLoggerConfig();

  test.describe('2xx Responses Not Logged', () => {
    test('successful requests are not logged', async ({ request }) => {
      // Clear logs first (ignore errors)
      await clearErrorLogs(request, ERROR_LOGS_ENDPOINT);

      const healthPath = '/health';

      // Make a successful request
      const healthResponse = await request.get(`${API_BASE_URL}${healthPath}`);
      expect(healthResponse.status()).toBe(200);

      // Small delay to ensure any logging would have occurred
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check error log - the successful request should NOT create a log entry
      // Use retry logic to handle transient issues
      let logs: Array<{ path: string }> = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await request.get(ERROR_LOGS_ENDPOINT);
          if (response.ok()) {
            logs = await response.json();
            break;
          }
        } catch {
          // Retry on parse error
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // The health endpoint should NOT appear in error logs (it's a 2xx response)
      const healthLogs = logs.filter((log) => log.path === healthPath);
      expect(healthLogs.length).toBe(0);
    });
  });

  test.describe('Multiple Errors Accumulation', () => {
    test('multiple errors are accumulated in log', async ({ request }) => {
      // Use unique paths to avoid conflicts with parallel tests
      const timestamp = Date.now();
      const testPaths = [
        `/api/v1/system-integration/error-test-${timestamp}-1`,
        `/api/v1/system-integration/error-test-${timestamp}-2`,
        `/api/v1/system-integration/error-test-${timestamp}-3`
      ];

      // Trigger multiple errors
      for (const testPath of testPaths) {
        await request.get(`${API_BASE_URL}${testPath}`);
      }

      // Wait for all errors to be logged using polling
      const matchedLogs = await waitForLogEntry(
        request,
        ERROR_LOGS_ENDPOINT,
        (log: Record<string, unknown>) => testPaths.includes(log.path as string),
        10, // More attempts since we're waiting for 3 logs
        200
      );

      // Verify all 3 paths were logged (filter again to ensure exact match)
      const ourLogs = matchedLogs.filter(
        (log: Record<string, unknown>) => testPaths.includes(log.path as string)
      );
      expect(ourLogs.length).toBe(3);
    });
  });

  test.describe('Query Parameters Logging', () => {
    test('query parameters are logged', async ({ request }) => {
      // Use unique path
      const testPath = `/api/v1/system-integration/query-params-test-${Date.now()}`;
      await request.get(`${API_BASE_URL}${testPath}?foo=bar&baz=qux`);

      // Wait for log to be written
      const matchedLogs = await waitForLogEntry(
        request,
        ERROR_LOGS_ENDPOINT,
        (log: Record<string, unknown>) => log.path === testPath
      );
      expect(matchedLogs.length).toBeGreaterThan(0);
      expect(matchedLogs[0].query).toBe('foo=bar&baz=qux');
    });
  });

  test.describe('HTTP Methods Logging', () => {
    test('logs POST requests', async ({ request }) => {
      const postPath = `/api/v1/system-integration/post-test-${Date.now()}`;
      await request.post(`${API_BASE_URL}${postPath}`);

      const matchedLogs = await waitForLogEntry(
        request,
        ERROR_LOGS_ENDPOINT,
        (log: Record<string, unknown>) =>
          log.method === 'POST' && log.path === postPath
      );
      expect(matchedLogs.length).toBeGreaterThan(0);
    });

    test('logs PUT requests', async ({ request }) => {
      const putPath = `/api/v1/system-integration/put-test-${Date.now()}`;
      await request.put(`${API_BASE_URL}${putPath}`);

      const matchedLogs = await waitForLogEntry(
        request,
        ERROR_LOGS_ENDPOINT,
        (log: Record<string, unknown>) =>
          log.method === 'PUT' && log.path === putPath
      );
      expect(matchedLogs.length).toBeGreaterThan(0);
    });

    test('logs DELETE requests', async ({ request }) => {
      const deletePath = `/api/v1/system-integration/delete-test-${Date.now()}`;
      await request.delete(`${API_BASE_URL}${deletePath}`);

      const matchedLogs = await waitForLogEntry(
        request,
        ERROR_LOGS_ENDPOINT,
        (log: Record<string, unknown>) =>
          log.method === 'DELETE' && log.path === deletePath
      );
      expect(matchedLogs.length).toBeGreaterThan(0);
    });
  });
});
