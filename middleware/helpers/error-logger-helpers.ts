/**
 * @fileoverview Error Logger Test Helpers
 *
 * Shared utilities for Error Logger Middleware E2E tests.
 * NOTE: This file should NOT import 'test' from @playwright/test
 * to avoid test initialization conflicts.
 */
import { expect, APIRequestContext } from '@playwright/test';
import { loadTestConfig } from '../../helpers/test-config';
import { INVALID_TEST_TOKEN } from '../../helpers/auth';

export { INVALID_TEST_TOKEN };

/**
 * Get test configuration and error logs endpoint
 */
export function getErrorLoggerConfig() {
  const config = loadTestConfig();
  const API_BASE_URL = config.apiBaseUrl;
  const ERROR_LOGS_ENDPOINT = `${API_BASE_URL}/api/v1/admin/error-logs`;
  return { API_BASE_URL, ERROR_LOGS_ENDPOINT, config };
}

/**
 * Clear error logs before test (shared beforeEach logic)
 */
export async function clearErrorLogs(request: APIRequestContext, errorLogsEndpoint: string) {
  const response = await request.delete(errorLogsEndpoint);
  // Accept 200 (success) or 404 (no logs to clear)
  expect([200, 404]).toContain(response.status());
}

/**
 * Wait for an error to be logged (with polling)
 * Increased default attempts and delay for CI/validator environment reliability
 * Handles transient empty responses gracefully
 */
export async function waitForLogEntry(
  request: APIRequestContext,
  errorLogsEndpoint: string,
  filterFn: (log: Record<string, unknown>) => boolean,
  maxAttempts = 20,
  delayMs = 500
): Promise<Array<Record<string, unknown>>> {
  let matchedLogs: Array<Record<string, unknown>> = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await request.get(errorLogsEndpoint);
      if (!response.ok()) {
        // Retry if error logs endpoint is not ready yet
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      const logs = await response.json();
      if (!Array.isArray(logs)) {
        // Invalid response format, retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      matchedLogs = logs.filter(filterFn);
      if (matchedLogs.length > 0) break;
    } catch {
      // JSON parse error or network error, retry
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return matchedLogs;
}
