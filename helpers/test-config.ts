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
 *
 * @throws Error if neither COLIMA_VM_URL nor API_BASE_URL is set in environment
 */
export function loadTestConfig(): TestConfig {
  const colimaVmUrl = process.env.COLIMA_VM_URL;
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!colimaVmUrl && !apiBaseUrl) {
    throw new Error(
      'COLIMA_VM_URL or API_BASE_URL environment variable must be set.\n' +
      'Example: export COLIMA_VM_URL=http://192.168.64.2:8080\n' +
      'Or set it in your .env file.'
    );
  }

  return {
    apiBaseUrl: apiBaseUrl || `${colimaVmUrl}:8080`,
    baseUrl: process.env.BASE_URL || apiBaseUrl || `${colimaVmUrl}:8080`,
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
