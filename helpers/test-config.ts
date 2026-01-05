/**
 * Centralized test configuration helper
 * Provides environment-based configuration for E2E tests
 */

export interface TestConfig {
  apiBaseUrl: string;
  baseUrl: string;
  colimaVmUrl: string | undefined;
  hasApiBaseUrl: boolean;
  hasColimaVmUrl: boolean;
}

export interface AuthHeaders {
  'Authorization': string;
}

/**
 * Load test configuration from environment
 * This centralizes all process.env access to prevent ESLint violations
 */
export function loadTestConfig(): TestConfig {
  const colimaVmUrl = process.env.COLIMA_VM_URL;
  const apiBaseUrl = process.env.API_BASE_URL;

  return {
    apiBaseUrl: apiBaseUrl || (colimaVmUrl ? `${colimaVmUrl}:8080` : 'http://localhost:8080'),
    baseUrl: process.env.BASE_URL || 'http://localhost:8080',
    colimaVmUrl,
    hasApiBaseUrl: !!apiBaseUrl,
    hasColimaVmUrl: !!colimaVmUrl,
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
