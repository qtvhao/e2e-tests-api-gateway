/**
 * @fileoverview Error Logger Middleware E2E Tests
 *
 * Tests for the error logging middleware that captures all non-200 responses
 * and writes them to a log file.
 *
 * @version 1.0.0
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Error log endpoint availability
 * - Non-2xx responses are logged
 * - Log entries contain expected fields
 * - Log clearing functionality
 * - Multiple error types (4xx, 5xx)
 *
 * Related files:
 * - services/system-integration/microservices/api-gateway/middleware/error_logger.go
 * - services/system-integration/microservices/api-gateway/main.go
 */

import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../helpers/test-config';

test.describe('Error Logger Middleware', () => {
  const config = loadTestConfig();
  const API_BASE_URL = config.apiBaseUrl;
  const ERROR_LOGS_ENDPOINT = `${API_BASE_URL}/api/v1/admin/error-logs`;

  test.beforeEach(async ({ request }) => {
    // Clear error logs before each test
    await request.delete(ERROR_LOGS_ENDPOINT);
  });

  test.describe('Error Log Endpoint', () => {
    test('GET /api/v1/admin/error-logs returns JSON array', async ({ request }) => {
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const logs = await response.json();
      expect(Array.isArray(logs)).toBe(true);
    });

    test('DELETE /api/v1/admin/error-logs clears the log', async ({ request }) => {
      // First trigger an error
      await request.get(`${API_BASE_URL}/api/nonexistent-endpoint-for-test`);

      // Verify error was logged
      let response = await request.get(ERROR_LOGS_ENDPOINT);
      let logs = await response.json();
      const initialCount = logs.length;
      expect(initialCount).toBeGreaterThan(0);

      // Clear logs
      response = await request.delete(ERROR_LOGS_ENDPOINT);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Error logs cleared');

      // Verify logs are empty
      response = await request.get(ERROR_LOGS_ENDPOINT);
      logs = await response.json();
      expect(logs.length).toBe(0);
    });
  });

  test.describe('Error Logging - 4xx Responses', () => {
    test('logs 404 Not Found errors', async ({ request }) => {
      // Trigger a 404 error
      const errorPath = '/api/this-endpoint-does-not-exist-404-test';
      await request.get(`${API_BASE_URL}${errorPath}`);

      // Check error log
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      expect(logs.length).toBeGreaterThan(0);

      const lastLog = logs[logs.length - 1];
      expect(lastLog.status).toBe(404);
      expect(lastLog.method).toBe('GET');
      expect(lastLog.path).toBe(errorPath);
    });

    test('logs 401 Unauthorized errors', async ({ request }) => {
      // Try to access a protected endpoint without auth
      const protectedPath = '/api/v1/admin/users';
      await request.get(`${API_BASE_URL}${protectedPath}`);

      // Check error log
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      const unauthorizedLogs = logs.filter(
        (log: { status: number; path: string }) =>
          log.status === 401 && log.path === protectedPath
      );
      expect(unauthorizedLogs.length).toBeGreaterThan(0);
    });

    test('logs 400 Bad Request errors', async ({ request }) => {
      // Send malformed JSON to login endpoint
      const loginPath = '/api/v1/auth/login';
      await request.post(`${API_BASE_URL}${loginPath}`, {
        headers: { 'Content-Type': 'application/json' },
        data: 'invalid json {'
      });

      // Check error log
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      const badRequestLogs = logs.filter(
        (log: { status: number; path: string }) =>
          log.status === 400 && log.path === loginPath
      );
      expect(badRequestLogs.length).toBeGreaterThan(0);
    });
  });

  test.describe('Log Entry Structure', () => {
    test('log entries contain all required fields', async ({ request }) => {
      // Trigger an error
      await request.get(`${API_BASE_URL}/api/test-error-fields-endpoint`);

      // Check error log
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      expect(logs.length).toBeGreaterThan(0);
      const entry = logs[logs.length - 1];

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
      // Trigger an error
      await request.get(`${API_BASE_URL}/api/test-timestamp-format`);

      // Check error log
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      const entry = logs[logs.length - 1];
      // RFC3339 format: 2024-01-15T10:30:00Z
      const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
      expect(entry.timestamp).toMatch(rfc3339Regex);
    });
  });

  test.describe('2xx Responses Not Logged', () => {
    test('successful requests are not logged', async ({ request }) => {
      // Clear logs first
      await request.delete(ERROR_LOGS_ENDPOINT);

      // Make a successful request
      const healthResponse = await request.get(`${API_BASE_URL}/health`);
      expect(healthResponse.status()).toBe(200);

      // Check error log - should be empty (only error-logs endpoint calls)
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      // Filter out any logs for the error-logs endpoint itself
      const nonAdminLogs = logs.filter(
        (log: { path: string }) => !log.path.includes('error-logs')
      );
      expect(nonAdminLogs.length).toBe(0);
    });
  });

  test.describe('Multiple Errors Accumulation', () => {
    test('multiple errors are accumulated in log', async ({ request }) => {
      // Clear logs
      await request.delete(ERROR_LOGS_ENDPOINT);

      // Trigger multiple errors
      await request.get(`${API_BASE_URL}/api/error-test-1`);
      await request.get(`${API_BASE_URL}/api/error-test-2`);
      await request.get(`${API_BASE_URL}/api/error-test-3`);

      // Check error log
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      expect(logs.length).toBe(3);
      expect(logs[0].path).toBe('/api/error-test-1');
      expect(logs[1].path).toBe('/api/error-test-2');
      expect(logs[2].path).toBe('/api/error-test-3');
    });
  });

  test.describe('Query Parameters Logging', () => {
    test('query parameters are logged', async ({ request }) => {
      // Trigger error with query params
      await request.get(`${API_BASE_URL}/api/nonexistent?foo=bar&baz=qux`);

      // Check error log
      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      const lastLog = logs[logs.length - 1];
      expect(lastLog.query).toBe('foo=bar&baz=qux');
    });
  });

  test.describe('HTTP Methods Logging', () => {
    test('logs POST requests', async ({ request }) => {
      await request.post(`${API_BASE_URL}/api/nonexistent-post`);

      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      const postLogs = logs.filter(
        (log: { method: string; path: string }) =>
          log.method === 'POST' && log.path === '/api/nonexistent-post'
      );
      expect(postLogs.length).toBeGreaterThan(0);
    });

    test('logs PUT requests', async ({ request }) => {
      await request.put(`${API_BASE_URL}/api/nonexistent-put`);

      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      const putLogs = logs.filter(
        (log: { method: string; path: string }) =>
          log.method === 'PUT' && log.path === '/api/nonexistent-put'
      );
      expect(putLogs.length).toBeGreaterThan(0);
    });

    test('logs DELETE requests', async ({ request }) => {
      await request.delete(`${API_BASE_URL}/api/nonexistent-delete`);

      const response = await request.get(ERROR_LOGS_ENDPOINT);
      const logs = await response.json();

      const deleteLogs = logs.filter(
        (log: { method: string; path: string }) =>
          log.method === 'DELETE' && log.path === '/api/nonexistent-delete'
      );
      expect(deleteLogs.length).toBeGreaterThan(0);
    });
  });
});
