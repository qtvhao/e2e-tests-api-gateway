import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway and Main Application
 *
 * This test suite validates:
 * - Health check endpoints (no authentication)
 * - Authentication flow (login/logout)
 * - Navigation configuration endpoint
 * - Protected route behavior
 * - Dashboard page UI and functionality
 */

test.describe('API Gateway Health Endpoints', () => {
  test('should return healthy status from /health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should return ready status from /health/ready endpoint', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();
  });

  test('should return live status from /health/live endpoint', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Navigation API', () => {
  test('should return navigation items from /api/navigation', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
  });
});

test.describe('Authentication Flow', () => {
  test('should require authentication for protected API endpoints', async ({ request }) => {
    const response = await request.get('/api/v1/hr-management');
    expect(response.status()).toBe(401);
  });

  test('should redirect to login page when accessing protected routes without auth', async ({ page }) => {
    await page.goto('/');
    // Should be redirected to login page
    await expect(page.getByRole('heading', { name: /welcome to ugjb/i })).toBeVisible();
  });
});

test.describe('Login Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with correct branding', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome to ugjb/i })).toBeVisible();
    await expect(page.getByText(/unified workforce management platform/i)).toBeVisible();
  });

  test('should display email input field', async ({ page }) => {
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByPlaceholder(/you@company.com/i)).toBeVisible();
  });

  test('should display password input field', async ({ page }) => {
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
  });

  test('should display sign in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display demo mode hint', async ({ page }) => {
    await expect(page.getByText(/demo: enter any email and password/i)).toBeVisible();
  });
});

test.describe('Login User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should accept email input', async ({ page }) => {
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should accept password input', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill('password123');
    await expect(passwordInput).toHaveValue('password123');
  });

  test('should submit form with valid credentials', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();

    // After successful login, should redirect to dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard Page UI', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display dashboard page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/overview of workforce management metrics/i)).toBeVisible();
  });

  test('should display sidebar with UGJB branding', async ({ page }) => {
    await expect(page.getByText('UGJB')).toBeVisible();
    await expect(page.getByText(/workforce management platform/i)).toBeVisible();
  });

  test('should display navigation items in sidebar', async ({ page }) => {
    // Check for main navigation links
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });

  test('should display Recent Activity section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /recent activity/i })).toBeVisible();
  });

  test('should display FTE Distribution section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /fte distribution by department/i })).toBeVisible();
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Employees page', async ({ page }) => {
    await page.getByRole('link', { name: /employees/i }).click();
    await expect(page).toHaveURL(/.*employees/);
  });

  test('should navigate to Skills page', async ({ page }) => {
    await page.getByRole('link', { name: /skills/i }).click();
    await expect(page).toHaveURL(/.*skills/);
  });

  test('should navigate to Projects page', async ({ page }) => {
    await page.getByRole('link', { name: /projects/i }).click();
    await expect(page).toHaveURL(/.*projects/);
  });

  test('should navigate to Assignments page', async ({ page }) => {
    await page.getByRole('link', { name: /assignments/i }).click();
    await expect(page).toHaveURL(/.*assignments/);
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/.*settings/);
  });

  test('should return to Dashboard from other pages', async ({ page }) => {
    await page.getByRole('link', { name: /employees/i }).click();
    await expect(page).toHaveURL(/.*employees/);
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/^https?:\/\/[^\/]+\/$/);
  });
});

test.describe('Error Handling', () => {
  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist');
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
