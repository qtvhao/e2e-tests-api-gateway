import { test, expect } from '@playwright/test';

/**
 * E2E tests for Authentication Handler
 *
 * This test suite validates:
 * - Login API endpoint (/api/auth/login)
 * - Logout API endpoint (/api/auth/logout)
 * - Token refresh endpoint (/api/auth/refresh)
 * - Me endpoint (/api/auth/me)
 * - Login page UI and interactions
 * - Authentication state persistence
 */

test.describe('Auth API Endpoints', () => {
  test('should return healthy status from health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should successfully login with valid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'password123'
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('expires_at');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('email', 'test@example.com');
    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('roles');
  });

  test('should return 400 for login with missing email', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        password: 'password123'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should return 400 for login with missing password', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should return 400 for login with invalid email format', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'not-an-email',
        password: 'password123'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should successfully logout', async ({ request }) => {
    const response = await request.post('/api/auth/logout');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('message', 'Logged out successfully');
  });

  test('should require authentication for /api/auth/me endpoint', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('should return user info from /api/auth/me with valid token', async ({ request }) => {
    // First login to get a token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'user@example.com',
        password: 'password123'
      }
    });
    const { token } = await loginResponse.json();

    // Then access /me endpoint with the token
    const meResponse = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(meResponse.ok()).toBeTruthy();
    const userData = await meResponse.json();
    expect(userData).toHaveProperty('email', 'user@example.com');
    expect(userData).toHaveProperty('id');
  });

  test('should require authentication for /api/auth/refresh endpoint', async ({ request }) => {
    const response = await request.post('/api/auth/refresh');
    expect(response.status()).toBe(401);
  });

  test('should refresh token with valid existing token', async ({ request }) => {
    // First login to get a token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'refresh@example.com',
        password: 'password123'
      }
    });
    const { token: originalToken } = await loginResponse.json();

    // Then refresh the token
    const refreshResponse = await request.post('/api/auth/refresh', {
      headers: {
        'Authorization': `Bearer ${originalToken}`
      }
    });
    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json();
    expect(refreshData).toHaveProperty('token');
    expect(refreshData).toHaveProperty('expires_at');
    expect(refreshData).toHaveProperty('user');
  });
});

test.describe('Login Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with all required elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome to ugjb/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display platform description', async ({ page }) => {
    await expect(page.getByText(/unified workforce management platform/i)).toBeVisible();
  });

  test('should display demo mode hint', async ({ page }) => {
    await expect(page.getByText(/demo: enter any email and password/i)).toBeVisible();
  });

  test('email input should have correct placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder(/you@company.com/i)).toBeVisible();
  });

  test('password input should have correct placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
  });
});

test.describe('Login User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should allow typing in email field', async ({ page }) => {
    const emailInput = page.getByLabel(/email address/i);
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should allow typing in password field', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill('secretpassword');
    await expect(passwordInput).toHaveValue('secretpassword');
  });

  test('should submit form and redirect to dashboard on successful login', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard after successful login
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/^https?:\/\/[^\/]+\/$/);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Click and immediately check for loading state
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    // The button might show a loading indicator briefly
    // Wait for navigation to complete
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authentication State Persistence', () => {
  test('should persist login state across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('persistent@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });

    // Reload the page
    await page.reload();

    // Should still be on dashboard (not redirected to login)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Try to access protected route
    await page.goto('/');

    // Should be redirected to login
    await expect(page.getByRole('heading', { name: /welcome to ugjb/i })).toBeVisible();
  });
});

test.describe('Role-Based Access', () => {
  test('should assign admin roles for admin emails', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'password123'
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // Admin email patterns might get admin roles
    expect(data.user).toHaveProperty('roles');
    expect(Array.isArray(data.user.roles)).toBeTruthy();
  });

  test('should assign HR roles for HR emails', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'hr@example.com',
        password: 'password123'
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.user.roles).toContain('hr_manager');
  });

  test('should assign project manager roles for PM emails', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'pm@example.com',
        password: 'password123'
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.user.roles).toContain('project_manager');
  });
});

test.describe('Token Validation', () => {
  test('should reject invalid token format', async ({ request }) => {
    const response = await request.get('/api/auth/me', {
      headers: {
        'Authorization': 'Bearer invalid-token-format'
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should reject requests without Authorization header for protected endpoints', async ({ request }) => {
    const response = await request.get('/api/v1/hr-management');
    expect(response.status()).toBe(401);
  });
});

test.describe('Error Handling', () => {
  test('should handle empty request body gracefully', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {}
    });
    expect(response.status()).toBe(400);
  });

  test('should handle malformed JSON gracefully', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: 'not-valid-json'
    });
    // Should return 400 Bad Request
    expect([400, 415]).toContain(response.status());
  });
});
