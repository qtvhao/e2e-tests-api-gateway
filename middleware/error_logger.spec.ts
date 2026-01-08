import { test, expect } from '@playwright/test';
import { expectSuccessResponse } from '../helpers/api-test-utils';

/**
 * E2E tests for Error Logger Middleware
 * Source: services/system-integration/microservices/api-gateway/middleware/error_logger.go
 * Service: API Gateway (system-integration)
 *
 * The ErrorLogger middleware logs non-2xx responses to a JSON file.
 * Admin endpoints are exposed at:
 * - GET /api/v1/admin/error-logs - Read error logs
 * - DELETE /api/v1/admin/error-logs - Clear error logs
 *
 * NOTE: Tests avoid DELETE /api/v1/admin/error-logs to prevent flaky parallel execution.
 * Instead, tests use unique paths and search for their specific entries in the log.
 */

interface ErrorLogEntry {
  timestamp: string;
  method: string;
  path: string;
  query?: string;
  status: number;
  client_ip: string;
  user_agent?: string;
  error?: string;
  message?: string;
  latency: string;
  request_id?: string;
}

// Generate unique test path to avoid conflicts between parallel test runs
function uniqueTestPath(testName: string): string {
  return `/api/v1/error-logger-test-${testName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Error Logger Middleware', () => {
  test.describe('GET /api/v1/admin/error-logs', () => {
    test('should return array of error logs', async ({ request }) => {
      const response = await request.get('/api/v1/admin/error-logs');
      expect(response.ok()).toBe(true);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    test('should return JSON content type', async ({ request }) => {
      const response = await request.get('/api/v1/admin/error-logs');
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });

  test.describe('Error Logging Functionality', () => {
    test('should log 404 errors from non-existent API endpoints', async ({ request }) => {
      // Use unique path to avoid conflicts with parallel tests
      const testPath = uniqueTestPath('404-test');

      // Trigger a 404 error by requesting non-existent API endpoint
      const errorResponse = await request.get(testPath);
      expect(errorResponse.status()).toBe(404);

      // Check that the error was logged
      const logsResponse = await request.get('/api/v1/admin/error-logs');
      expect(logsResponse.ok()).toBe(true);
      const logs: ErrorLogEntry[] = await logsResponse.json();

      // Find the logged 404 error for our unique path
      const errorEntry = logs.find(
        (entry) => entry.path === testPath && entry.status === 404
      );

      expect(errorEntry).toBeDefined();
      expect(errorEntry?.method).toBe('GET');
      expect(errorEntry?.status).toBe(404);
      expect(errorEntry?.timestamp).toBeDefined();
      expect(errorEntry?.latency).toBeDefined();
    });

    test('should log errors from requests to protected endpoints without auth', async ({ request }) => {
      // Use unique path with query parameter to identify this test's request
      const testId = `error-logger-auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Trigger an error by requesting protected endpoint without auth
      // The endpoint returns an error (401 or 500 depending on backend config)
      const errorResponse = await request.get(`/api/v1/auth/me?test_id=${testId}`);
      const status = errorResponse.status();
      expect(status).toBeGreaterThanOrEqual(400);

      // Check that the error was logged
      const logsResponse = await request.get('/api/v1/admin/error-logs');
      expect(logsResponse.ok()).toBe(true);
      const logs: ErrorLogEntry[] = await logsResponse.json();

      // Find the logged error entry by query parameter
      const errorEntry = logs.find(
        (entry) => entry.path === '/api/v1/auth/me' && entry.query?.includes(testId)
      );

      expect(errorEntry).toBeDefined();
      expect(errorEntry?.method).toBe('GET');
      expect(errorEntry?.status).toBe(status);
    });

    test('should NOT log successful 2xx responses', async ({ request }) => {
      // Make a successful request to /health
      const healthResponse = await request.get('/health');
      await expectSuccessResponse(healthResponse);

      // Check that no 200 entries exist for /health
      const logsResponse = await request.get('/api/v1/admin/error-logs');
      expect(logsResponse.ok()).toBe(true);
      const logs: ErrorLogEntry[] = await logsResponse.json();

      // Should not find any entry for the health endpoint with status 200
      const healthEntry = logs.find((entry) => entry.path === '/health' && entry.status === 200);
      expect(healthEntry).toBeUndefined();
    });

    test('should capture error message from JSON response body', async ({ request }) => {
      // Use unique path to identify this test
      const testPath = uniqueTestPath('message-capture');

      // Trigger an error
      await request.get(testPath);

      // Check the logged error has message field (may be empty string)
      const logsResponse = await request.get('/api/v1/admin/error-logs');
      expect(logsResponse.ok()).toBe(true);
      const logs: ErrorLogEntry[] = await logsResponse.json();

      const errorEntry = logs.find((entry) => entry.path === testPath);
      expect(errorEntry).toBeDefined();
      // The message field should exist and be a string (may be empty)
      expect(typeof errorEntry?.message).toBe('string');
    });
  });

  test.describe('Log Entry Structure', () => {
    test('should have correct structure for error log entries', async ({ request }) => {
      // Use unique path for this test
      const testPath = uniqueTestPath('structure-test');
      await request.get(testPath);

      const logsResponse = await request.get('/api/v1/admin/error-logs');
      expect(logsResponse.ok()).toBe(true);
      const logs: ErrorLogEntry[] = await logsResponse.json();

      // Find the entry for our test path
      const entry = logs.find((e) => e.path === testPath);
      expect(entry).toBeDefined();

      if (entry) {
        // Required fields
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('method');
        expect(entry).toHaveProperty('path');
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('client_ip');
        expect(entry).toHaveProperty('latency');

        // Validate types
        expect(typeof entry.timestamp).toBe('string');
        expect(typeof entry.method).toBe('string');
        expect(typeof entry.path).toBe('string');
        expect(typeof entry.status).toBe('number');
        expect(typeof entry.client_ip).toBe('string');
        expect(typeof entry.latency).toBe('string');

        // Validate timestamp is RFC3339 format
        expect(() => new Date(entry.timestamp)).not.toThrow();
        expect(new Date(entry.timestamp).toISOString()).toBeDefined();
      }
    });
  });
});
