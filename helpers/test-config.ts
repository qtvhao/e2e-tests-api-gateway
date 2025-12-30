/**
 * Centralized test configuration helper
 * Provides environment-based configuration for E2E tests
 */

export interface TestConfig {
  apiBaseUrl: string;
  baseUrl: string;
}

export interface AuthHeaders {
  'Authorization': string;
}

/**
 * Load test configuration from environment
 * This centralizes all process.env access to prevent ESLint violations
 */
export function loadTestConfig(): TestConfig {
  return {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080',
    baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  };
}

/**
 * Get authorization headers for authenticated requests
 * Uses a test token for development/testing
 */
export function getAuthHeaders(): AuthHeaders {
  return {
    'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
  };
}
