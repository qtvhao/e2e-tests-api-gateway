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
    { timeout: 8000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 5000 });
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
    { timeout: 8000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 5000 });
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
    { timeout: 8000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 5000 });
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
    { timeout: 8000 }
  );
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await loginResponsePromise;

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 5000 });
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
