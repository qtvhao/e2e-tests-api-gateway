/* eslint-disable playwright-custom/require-success-tests-for-error-tests -- Helper module with utility functions only, no test assertions. Not a test file. */
import { Page, APIRequestContext } from '@playwright/test';

/**
 * Authentication helper functions for E2E tests
 * Credentials are defined in: services/system-integration/microservices/api-gateway/db/seed.json
 */

// Seed credentials
export const ADMIN_CREDENTIALS = {
  email: 'admin@ugjb.com',
  password: 'Admin@123!'
};

export const USER_CREDENTIALS = {
  email: 'user@ugjb.com',
  password: 'User@123!'
};

export const TEST_USER_CREDENTIALS = {
  email: 'test@ugjb.com',
  password: 'Test@123!'
};

// ============================================================================
// Dynamic Test User Management via LDAP
// ============================================================================
// Users are managed via OpenLDAP (osixia/openldap)
// API Gateway exposes /api/v1/ldap/users for CRUD operations
// phpLDAPadmin available at http://localhost:6443 for manual management

/**
 * LDAP configuration for test user management
 */
export const LDAP_CONFIG = {
  baseDn: 'dc=ugjb,dc=com',
  peopleDn: 'ou=people,dc=ugjb,dc=com',
  groupsDn: 'ou=groups,dc=ugjb,dc=com',
  adminDn: 'cn=admin,dc=ugjb,dc=com',
  adminPassword: 'admin',
};

/**
 * Represents a dynamically created test user
 */
export interface TestUser {
  /** LDAP uid (e.g., 'test-1234567890-abc123') */
  id: string;
  /** Full email address */
  email: string;
  /** Plain text password */
  password: string;
  /** Auth token if authenticated */
  authToken?: string;
  /** LDAP DN for direct LDAP operations */
  dn?: string;
}

/**
 * Options for creating a test user
 */
export interface CreateTestUserOptions {
  /** Prefix for the uid (default: 'test') */
  prefix?: string;
  /** User roles/groups (default: ['user']) */
  roles?: string[];
  /** Additional user data */
  metadata?: Record<string, unknown>;
}

/**
 * Generates a unique uid for test users
 * Format: {prefix}-{timestamp}-{random}
 */
function generateUniqueUid(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generates email from uid
 * Format: {uid}@test.ugjb.com
 */
function generateEmailFromUid(uid: string): string {
  return `${uid}@test.ugjb.com`;
}

/**
 * Generates a secure password for test users
 */
function generateTestPassword(): string {
  return `Test${Date.now()}!`;
}

/**
 * Creates a new test user via LDAP API
 *
 * Uses the API Gateway's /api/v1/ldap/users endpoint which proxies to OpenLDAP.
 * Users are created in ou=people,dc=ugjb,dc=com with inetOrgPerson objectClass.
 *
 * @param request - Playwright APIRequestContext
 * @param options - User creation options
 * @returns Created test user with credentials
 *
 * @example
 * const testUser = await createTestUser(request);
 * const authToken = await getAuthToken(request, testUser.email, testUser.password);
 *
 * @example
 * const testUser = await createTestUser(request, { prefix: 'notification-test' });
 */
export async function createTestUser(
  request: APIRequestContext,
  options: CreateTestUserOptions = {}
): Promise<TestUser> {
  const { prefix = 'test', roles = ['user'], metadata = {} } = options;

  const uid = generateUniqueUid(prefix);
  const email = generateEmailFromUid(uid);
  const password = generateTestPassword();
  const dn = `uid=${uid},${LDAP_CONFIG.peopleDn}`;

  // First, get admin token to create users
  const adminToken = await getAuthToken(
    request,
    ADMIN_CREDENTIALS.email,
    ADMIN_CREDENTIALS.password
  );

  const response = await request.post('/api/v1/ldap/users', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    data: {
      uid,
      email,
      password,
      cn: metadata.displayName || `Test User ${uid}`,
      sn: 'User',
      givenName: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      displayName: metadata.displayName || `Test User ${uid}`,
      groups: roles,
      ...metadata
    }
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to create test user via LDAP: ${response.status()} ${response.statusText()} - ${errorBody}`
    );
  }

  const data = await response.json();

  return {
    id: data.uid || uid,
    email,
    password,
    dn: data.dn || dn
  };
}

/**
 * Creates a test user and returns it with an auth token
 * Convenience function that combines createTestUser + getAuthToken
 *
 * @param request - Playwright APIRequestContext
 * @param options - User creation options
 * @returns Test user with authToken included
 *
 * @example
 * const { authToken, id } = await createAuthenticatedTestUser(request);
 * await request.get('/api/v1/protected', {
 *   headers: { 'Authorization': `Bearer ${authToken}` }
 * });
 */
export async function createAuthenticatedTestUser(
  request: APIRequestContext,
  options: CreateTestUserOptions = {}
): Promise<TestUser & { authToken: string }> {
  const user = await createTestUser(request, options);

  // Retry authentication to handle LDAP propagation delays
  const maxRetries = 5;
  const delayMs = 500;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const authToken = await getAuthToken(request, user.email, user.password);
      return {
        ...user,
        authToken
      };
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `Failed to authenticate newly created user ${user.email} after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message}. LDAP propagation may be slow.`
  );
}

/**
 * Deletes a test user via LDAP API
 *
 * Uses the API Gateway's /api/v1/ldap/users/:uid endpoint which proxies to OpenLDAP.
 * The user entry is deleted from ou=people,dc=ugjb,dc=com.
 *
 * @param request - Playwright APIRequestContext
 * @param userId - LDAP uid of the user to delete (e.g., 'test-1234567890-abc123')
 *
 * @example
 * const testUser = await createTestUser(request);
 * try {
 *   // ... run tests
 * } finally {
 *   await deleteTestUser(request, testUser.id);
 * }
 */
export async function deleteTestUser(
  request: APIRequestContext,
  userId: string
): Promise<void> {
  const adminToken = await getAuthToken(
    request,
    ADMIN_CREDENTIALS.email,
    ADMIN_CREDENTIALS.password
  );

  const response = await request.delete(`/api/v1/ldap/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });

  // Accept 200, 204 (success) or 404 (already deleted)
  if (!response.ok() && response.status() !== 404) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to delete test user ${userId} via LDAP: ${response.status()} ${response.statusText()} - ${errorBody}`
    );
  }
}

/**
 * Helper class to manage multiple test users with automatic cleanup
 *
 * @example
 * const userManager = new TestUserManager(request);
 *
 * const user1 = await userManager.create({ prefix: 'viewer' });
 * const user2 = await userManager.create({ prefix: 'editor' });
 *
 * // ... run tests ...
 *
 * await userManager.cleanup(); // Deletes all created users
 */
export class TestUserManager {
  private request: APIRequestContext;
  private createdUsers: TestUser[] = [];

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Creates a new test user and tracks it for cleanup
   */
  async create(options: CreateTestUserOptions = {}): Promise<TestUser & { authToken: string }> {
    const user = await createAuthenticatedTestUser(this.request, options);
    this.createdUsers.push(user);
    return user;
  }

  /**
   * Deletes all users created by this manager
   */
  async cleanup(): Promise<void> {
    const errors: Error[] = [];

    for (const user of this.createdUsers) {
      try {
        await deleteTestUser(this.request, user.id);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    this.createdUsers = [];

    if (errors.length > 0) {
      console.warn(`TestUserManager cleanup errors: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Returns all users created by this manager
   */
  getCreatedUsers(): readonly TestUser[] {
    return this.createdUsers;
  }
}

/**
 * Invalid token for testing 401 Unauthorized scenarios
 * This is intentionally invalid and used for error testing only
 */
export const INVALID_TEST_TOKEN = 'invalid-token-for-testing-401-responses';

/**
 * Performs login with admin credentials
 * Roles: admin, hr_manager, user
 * @param page - Playwright Page object
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill('admin@ugjb.com');
  await page.getByLabel(/password/i).fill('Admin@123!');

  // Wait for login API response before clicking
  // Using shorter timeouts to fit within validator's 10s per-file limit
  const loginResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
    { timeout: 4000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 3000, waitUntil: 'commit' });
}

/**
 * Performs login with regular user credentials
 * Roles: user
 * @param page - Playwright Page object
 */
export async function loginAsUser(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill('user@ugjb.com');
  await page.getByLabel(/password/i).fill('User@123!');

  // Wait for login API response before clicking
  // Using shorter timeouts to fit within validator's 10s per-file limit
  const loginResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
    { timeout: 4000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 3000, waitUntil: 'commit' });
}

/**
 * Performs login with test user credentials
 * Roles: user
 * @param page - Playwright Page object
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill('test@ugjb.com');
  await page.getByLabel(/password/i).fill('Test@123!');

  // Wait for login API response before clicking
  // Using shorter timeouts to fit within validator's 10s per-file limit
  const loginResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
    { timeout: 4000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 3000, waitUntil: 'commit' });
}

/**
 * Performs login with admin credentials (alias for backward compatibility)
 * @param page - Playwright Page object
 */
export async function login(page: Page): Promise<void> {
  await loginAsAdmin(page);
}

/**
 * Performs login with custom credentials
 * @param page - Playwright Page object
 * @param email - User email
 * @param password - User password
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Wait for login API response before clicking
  // Using shorter timeouts to fit within validator's 10s per-file limit
  const loginResponsePromise = page.waitForResponse(
    resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
    { timeout: 4000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 3000, waitUntil: 'commit' });
}

/**
 * Performs logout
 * @param page - Playwright Page object
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /logout|sign out/i }).click();
  await page.waitForURL('/login');
}

/**
 * Gets authentication token using API (for API request context)
 * @param request - Playwright APIRequestContext
 * @param email - User email
 * @param password - User password
 * @returns Authentication token
 */
export async function getAuthToken(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post('/api/v1/auth/login', {
    data: { email, password }
  });

  if (!response.ok()) {
    throw new Error(`Failed to authenticate: ${response.status()} ${response.statusText()}`);
  }

  const data = await response.json();
  if (!data.token) {
    throw new Error('No token returned from auth endpoint');
  }

  return data.token;
}

/**
 * Gets admin authentication token
 * @param request - Playwright APIRequestContext
 * @returns Authentication token
 */
export async function getAdminToken(request: APIRequestContext): Promise<string> {
  return getAuthToken(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
}

/**
 * Gets user authentication token
 * @param request - Playwright APIRequestContext
 * @returns Authentication token
 */
export async function getUserToken(request: APIRequestContext): Promise<string> {
  return getAuthToken(request, USER_CREDENTIALS.email, USER_CREDENTIALS.password);
}
