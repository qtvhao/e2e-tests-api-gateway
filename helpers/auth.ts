import { Page } from '@playwright/test';

/**
 * Authentication helper functions for E2E tests
 * Credentials are defined in: services/system-integration/microservices/api-gateway/db/seed.json
 */

/**
 * Performs login with admin credentials
 * Roles: admin, hr_manager, user
 * @param page - Playwright Page object
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill('admin@ugjb.com');
  await page.getByPlaceholder(/password/i).fill('Admin@123!');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/');
}

/**
 * Performs login with regular user credentials
 * Roles: user
 * @param page - Playwright Page object
 */
export async function loginAsUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill('user@ugjb.com');
  await page.getByPlaceholder(/password/i).fill('User@123!');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/');
}

/**
 * Performs login with test user credentials
 * Roles: user
 * @param page - Playwright Page object
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill('test@ugjb.com');
  await page.getByPlaceholder(/password/i).fill('Test@123!');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/');
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
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/');
}

/**
 * Performs logout
 * @param page - Playwright Page object
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /logout|sign out/i }).click();
  await page.waitForURL('/login');
}
