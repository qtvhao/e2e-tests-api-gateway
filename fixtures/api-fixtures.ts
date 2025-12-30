/* eslint-disable playwright-custom/require-success-tests-for-error-tests -- Fixture module, not a test file */
/* eslint-disable playwright-custom/no-test-without-assertion -- Fixture module, not a test file */
/**
 * @fileoverview Parameterized API Test Fixtures
 *
 * Provides reusable, multi-user authenticated API request contexts for E2E tests.
 * Supports dynamic user selection without creating separate fixtures for each user.
 *
 * @example
 * import { test, expect } from '../fixtures/api-fixtures';
 *
 * test('admin can access endpoint', async ({ authenticatedRequest }) => {
 *   const adminReq = await authenticatedRequest('admin');
 *   const response = await adminReq.get('/api/v1/protected');
 *   expect(response.ok()).toBe(true);
 * });
 *
 * test('multiple users interact', async ({ authenticatedRequest }) => {
 *   const adminReq = await authenticatedRequest('admin');
 *   const userReq = await authenticatedRequest('user');
 *   // Test interactions between different user roles
 * });
 *
 * @see services/system-integration/microservices/api-gateway/db/seed.json - User credentials
 * @see e2e/tests/system-integration/api-gateway/helpers/test-users.ts - TEST_USERS definition
 */
import { test as base, APIRequestContext } from '@playwright/test';
import { TEST_USERS } from '../helpers/test-users';
import { loadTestConfig } from '../helpers/test-config';

/**
 * User key type derived from TEST_USERS object
 */
export type UserKey = keyof typeof TEST_USERS;

/**
 * Function type for getting authenticated request context
 */
export type AuthenticatedRequestFn = (userKey: UserKey) => Promise<APIRequestContext>;

/**
 * Custom fixture types
 */
type ApiFixtures = {
  /**
   * Factory function to get authenticated API request context for any user
   * @param userKey - Key from TEST_USERS ('admin' | 'user' | 'test' | 'invalid')
   * @returns Authenticated APIRequestContext
   */
  authenticatedRequest: AuthenticatedRequestFn;

  /**
   * Pre-configured API base URL from test config
   */
  apiBaseUrl: string;
};

/**
 * Fetches authentication token for a user
 */
async function fetchAuthToken(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const response = await request.post('/api/v1/auth/login', {
    data: { email, password }
  });

  if (!response.ok()) {
    throw new Error(`Authentication failed for ${email}: ${response.status()}`);
  }

  const data = await response.json();
  if (!data.token) {
    throw new Error(`No token returned for ${email}`);
  }

  return data.token;
}

/**
 * Extended test with parameterized API fixtures
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/api-fixtures';
 *
 * test('test name', async ({ authenticatedRequest, apiBaseUrl }) => {
 *   const adminReq = await authenticatedRequest('admin');
 *   const response = await adminReq.get(`${apiBaseUrl}/api/v1/endpoint`);
 * });
 * ```
 */
export const test = base.extend<ApiFixtures>({
  /**
   * Provides the API base URL from configuration
   */
  apiBaseUrl: async ({}, use) => {
    const config = loadTestConfig();
    await use(config.apiBaseUrl);
  },

  /**
   * Factory fixture that creates authenticated request contexts on demand.
   * Supports multiple users in the same test with automatic cleanup.
   */
  authenticatedRequest: async ({ playwright }, use) => {
    const config = loadTestConfig();
    const contexts: APIRequestContext[] = [];
    const tokenCache = new Map<UserKey, string>();

    /**
     * Gets or creates an authenticated request context for the specified user
     */
    const getAuthenticatedContext = async (userKey: UserKey): Promise<APIRequestContext> => {
      const user = TEST_USERS[userKey];

      if (!user) {
        throw new Error(`Unknown user key: ${userKey}. Valid keys: ${Object.keys(TEST_USERS).join(', ')}`);
      }

      // Get token (fetch if not cached)
      let token = tokenCache.get(userKey);
      if (!token) {
        // Create a temporary context to fetch the token
        const tempContext = await playwright.request.newContext({
          baseURL: config.apiBaseUrl,
        });

        try {
          token = await fetchAuthToken(tempContext, user.email, user.password);
          tokenCache.set(userKey, token);
        } finally {
          await tempContext.dispose();
        }
      }

      // Create authenticated context with the token
      const authenticatedContext = await playwright.request.newContext({
        baseURL: config.apiBaseUrl,
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`,
        },
      });

      contexts.push(authenticatedContext);
      return authenticatedContext;
    };

    await use(getAuthenticatedContext);

    // Cleanup: dispose all created contexts
    for (const ctx of contexts) {
      await ctx.dispose();
    }
  },
});

/**
 * Re-export expect for convenience
 */
export { expect } from '@playwright/test';

/**
 * Re-export TEST_USERS for test files that need user data
 */
export { TEST_USERS } from '../helpers/test-users';

/**
 * Re-export UserKey type for type-safe user selection
 */
export type { UserKey as TestUserKey };
