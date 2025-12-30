/**
 * @fileoverview API Test Utilities - Reusable helper functions for E2E API tests
 *
 * This module provides DRY helper functions to reduce code duplication in API tests.
 * It includes utilities for:
 * - Making authenticated requests
 * - Validating response formats
 * - Common assertion patterns
 *
 * @example
 * import { postWithAuth, expectJsonResponse, expectValidApiResponse } from './api-test-utils';
 *
 * test('API test', async ({ request }) => {
 *   const token = await getAuthToken(request, email, password);
 *   const response = await postWithAuth(request, '/api/endpoint', token, { data: 'value' });
 *   const body = await expectValidApiResponse(response);
 * });
 */
import { APIRequestContext, APIResponse, expect } from '@playwright/test';

/**
 * Makes an authenticated POST request
 * @param request - Playwright APIRequestContext
 * @param endpoint - API endpoint URL
 * @param token - Bearer token for authentication
 * @param data - Request body data
 * @returns API response
 */
export async function postWithAuth(
  request: APIRequestContext,
  endpoint: string,
  token: string,
  data: Record<string, unknown>
): Promise<APIResponse> {
  return request.post(endpoint, {
    headers: { 'Authorization': `Bearer ${token}` },
    data
  });
}

/**
 * Makes an authenticated GET request
 * @param request - Playwright APIRequestContext
 * @param endpoint - API endpoint URL
 * @param token - Bearer token for authentication
 * @returns API response
 */
export async function getWithAuth(
  request: APIRequestContext,
  endpoint: string,
  token: string
): Promise<APIResponse> {
  return request.get(endpoint, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

/**
 * Makes an authenticated PUT request
 * @param request - Playwright APIRequestContext
 * @param endpoint - API endpoint URL
 * @param token - Bearer token for authentication
 * @param data - Request body data
 * @returns API response
 */
export async function putWithAuth(
  request: APIRequestContext,
  endpoint: string,
  token: string,
  data: Record<string, unknown>
): Promise<APIResponse> {
  return request.put(endpoint, {
    headers: { 'Authorization': `Bearer ${token}` },
    data
  });
}

/**
 * Makes an authenticated DELETE request
 * @param request - Playwright APIRequestContext
 * @param endpoint - API endpoint URL
 * @param token - Bearer token for authentication
 * @returns API response
 */
export async function deleteWithAuth(
  request: APIRequestContext,
  endpoint: string,
  token: string
): Promise<APIResponse> {
  return request.delete(endpoint, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

/**
 * Asserts that response has JSON content type
 * @param response - API response to validate
 */
export function expectJsonContentType(response: APIResponse): void {
  expect(response.headers()['content-type']).toContain('application/json');
}

/**
 * Validates response is JSON and not a "not found" error, returns parsed body
 * @param response - API response to validate
 * @returns Parsed JSON body
 */
export async function expectValidApiResponse(response: APIResponse): Promise<Record<string, unknown>> {
  expectJsonContentType(response);
  const body = await response.json();
  expect(body.error?.message).not.toBe('API endpoint not found');
  return body;
}

/**
 * Validates successful response (2xx) with JSON body
 * @param response - API response to validate
 * @returns Parsed JSON body
 */
export async function expectSuccessResponse(response: APIResponse): Promise<Record<string, unknown>> {
  expect(response.ok()).toBe(true);
  return expectValidApiResponse(response);
}

/**
 * Validates error response with expected status code
 * @param response - API response to validate
 * @param expectedStatus - Expected HTTP status code
 * @returns Parsed JSON body
 */
export async function expectErrorResponse(
  response: APIResponse,
  expectedStatus: number
): Promise<Record<string, unknown>> {
  expect(response.status()).toBe(expectedStatus);
  return expectValidApiResponse(response);
}

/**
 * Validates 401 Unauthorized response
 * @param response - API response to validate
 * @returns Parsed JSON body
 */
export async function expectUnauthorized(response: APIResponse): Promise<Record<string, unknown>> {
  return expectErrorResponse(response, 401);
}

/**
 * Validates 400 Bad Request response
 * @param response - API response to validate
 * @returns Parsed JSON body
 */
export async function expectBadRequest(response: APIResponse): Promise<Record<string, unknown>> {
  return expectErrorResponse(response, 400);
}

/**
 * Validates 403 Forbidden response
 * @param response - API response to validate
 * @returns Parsed JSON body
 */
export async function expectForbidden(response: APIResponse): Promise<Record<string, unknown>> {
  return expectErrorResponse(response, 403);
}

/**
 * Validates 404 Not Found response
 * @param response - API response to validate
 * @returns Parsed JSON body
 */
export async function expectNotFound(response: APIResponse): Promise<Record<string, unknown>> {
  return expectErrorResponse(response, 404);
}

/**
 * Validates health check endpoint
 * @param request - Playwright APIRequestContext
 * @param healthEndpoint - Health endpoint URL
 */
export async function expectHealthy(request: APIRequestContext, healthEndpoint: string): Promise<void> {
  const response = await request.get(healthEndpoint);
  expect(response.status()).toBe(200);
  await expectValidApiResponse(response);
}
