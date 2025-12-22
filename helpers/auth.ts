import { Page } from '@playwright/test';

/**
 * Authentication helper functions for E2E tests
 */

/**
 * Performs login with admin credentials
 * @param page - Playwright Page object
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill('admin@ugjb.com');
  await page.getByPlaceholder(/password/i).fill('Admin@123!');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/');
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
