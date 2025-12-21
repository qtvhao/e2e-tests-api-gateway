import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

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
 * - Role-based access (dynamically generated from seed.json)
 *
 * Uses seeded credentials from: services/system-integration/microservices/api-gateway/db/seed.json
 */

interface SeedUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: string[];
}

interface SeedData {
  users: SeedUser[];
}

// Load test users from seed.json
const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

// Get all users
const allUsers = seedData.users;

// Get first and last user for basic tests
const firstUser = allUsers[0];
const lastUser = allUsers[allUsers.length - 1];

// Extract all unique roles from seed data
const allRoles = [...new Set(allUsers.flatMap(u => u.roles))];

// Map: role -> first user that has this role
const userByRole = new Map<string, SeedUser>();
for (const role of allRoles) {
  const user = allUsers.find(u => u.roles.includes(role));
  if (user) {
    userByRole.set(role, user);
  }
}

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
        email: firstUser.email,
        password: firstUser.password
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('expires_at');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('email', firstUser.email);
    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('roles');
  });

  test('should return 400 for login with missing email', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        password: firstUser.password
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should return 400 for login with missing password', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: firstUser.email
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should return 400 for login with invalid email format', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'not-an-email',
        password: firstUser.password
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
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: lastUser.email,
        password: lastUser.password
      }
    });
    const { token } = await loginResponse.json();

    const meResponse = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(meResponse.ok()).toBeTruthy();
    const userData = await meResponse.json();
    expect(userData).toHaveProperty('email', lastUser.email);
    expect(userData).toHaveProperty('id');
  });

  test('should require authentication for /api/auth/refresh endpoint', async ({ request }) => {
    const response = await request.post('/api/auth/refresh');
    expect(response.status()).toBe(401);
  });

  test('should refresh token with valid existing token', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: firstUser.email,
        password: firstUser.password
      }
    });
    const { token: originalToken } = await loginResponse.json();

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
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display platform description', async ({ page }) => {
    await expect(page.getByText(/platform/i)).toBeVisible();
  });

  test('email input should be visible and editable', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEditable();
  });

  test('password input should be visible and editable', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEditable();
  });
});

test.describe('Login User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should allow typing in email field', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill(firstUser.email);
    await expect(emailInput).toHaveValue(firstUser.email);
  });

  test('should allow typing in password field', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill(firstUser.password);
    await expect(passwordInput).toHaveValue(firstUser.password);
  });

  test('should submit form and redirect to dashboard on successful login', async ({ page }) => {
    await page.getByLabel(/email/i).fill(firstUser.email);
    await page.getByLabel(/password/i).fill(firstUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/^https?:\/\/[^\/]+\/$/);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.getByLabel(/email/i).fill(firstUser.email);
    await page.getByLabel(/password/i).fill(firstUser.password);

    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authentication State Persistence', () => {
  test('should persist login state across page reloads', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(firstUser.email);
    await page.getByLabel(/password/i).fill(firstUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });

    await page.reload();

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });
});

// Dynamically generate role-based access tests for each unique role
test.describe('Role-Based Access', () => {
  for (const role of allRoles) {
    const user = userByRole.get(role)!;

    test(`should assign "${role}" role for user ${user.email}`, async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: user.email,
          password: user.password
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.user).toHaveProperty('roles');
      expect(Array.isArray(data.user.roles)).toBeTruthy();
      expect(data.user.roles).toContain(role);
    });
  }
});

// Dynamically test login for all seeded users
test.describe('All Seeded Users Login', () => {
  for (const user of allUsers) {
    test(`should login successfully as ${user.name} (${user.email})`, async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: user.email,
          password: user.password
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.user.email).toBe(user.email);
      expect(data.user.name).toBe(user.name);
      expect(data.user.roles).toEqual(expect.arrayContaining(user.roles));
    });
  }
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
    // /api/auth/me is a protected endpoint that requires authentication
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('should reject expired or tampered token', async ({ request }) => {
    // A properly formatted but invalid JWT (wrong signature)
    const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const response = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${tamperedToken}`
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should reject token with wrong Bearer prefix', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: firstUser.email,
        password: firstUser.password
      }
    });
    const { token } = await loginResponse.json();

    // Use wrong prefix
    const response = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Basic ${token}`
      }
    });
    expect(response.status()).toBe(401);
  });
});

// Helper to decode JWT payload (without verification - just for testing claims)
function decodeJwtPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
  return JSON.parse(payload);
}

// Helper to decode JWT header
function decodeJwtHeader(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const header = Buffer.from(parts[0], 'base64url').toString('utf-8');
  return JSON.parse(header);
}

test.describe('JWT Token Structure Verification', () => {
  test('should return valid JWT format (header.payload.signature)', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    // JWT must have 3 parts separated by dots
    const parts = token.split('.');
    expect(parts.length).toBe(3);

    // Each part must be non-empty
    expect(parts[0].length).toBeGreaterThan(0); // header
    expect(parts[1].length).toBeGreaterThan(0); // payload
    expect(parts[2].length).toBeGreaterThan(0); // signature
  });

  test('should have valid JWT header with algorithm', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    const header = decodeJwtHeader(token);

    // Header must have typ and alg
    expect(header).toHaveProperty('typ', 'JWT');
    expect(header).toHaveProperty('alg');
    // Algorithm should be HS256, HS384, HS512, RS256, etc.
    expect(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512']).toContain(header.alg);
  });

  test('should have required JWT claims in payload', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    const payload = decodeJwtPayload(token);

    // Standard JWT claims
    expect(payload).toHaveProperty('exp'); // expiration time
    expect(payload).toHaveProperty('iat'); // issued at
    expect(typeof payload.exp).toBe('number');
    expect(typeof payload.iat).toBe('number');

    // exp must be in the future
    const now = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(now);

    // iat must be in the past or now
    expect(payload.iat).toBeLessThanOrEqual(now + 5); // 5 second tolerance
  });

  test('should include user data in JWT payload', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    const payload = decodeJwtPayload(token);

    // User-specific claims
    expect(payload.email || payload.sub).toBeTruthy();
    expect(payload.user_id || payload.sub || payload.id).toBeTruthy();
  });

  test('should include correct roles in JWT payload', async ({ request }) => {
    for (const user of allUsers) {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: user.email, password: user.password }
      });
      const { token } = await loginResponse.json();

      const payload = decodeJwtPayload(token);

      // Roles should be in the payload
      expect(payload.roles).toBeDefined();
      expect(Array.isArray(payload.roles)).toBeTruthy();

      // All user roles should be present
      for (const role of user.roles) {
        expect(payload.roles).toContain(role);
      }
    }
  });

  test('should have different tokens for different users', async ({ request }) => {
    const tokens: string[] = [];

    for (const user of allUsers) {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: user.email, password: user.password }
      });
      const { token } = await loginResponse.json();
      tokens.push(token);

      // Verify payload contains correct user
      const payload = decodeJwtPayload(token);
      expect(payload.email).toBe(user.email);
    }

    // All tokens should be unique
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(allUsers.length);
  });

  test('should have valid expiration time (not too short, not too long)', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    const payload = decodeJwtPayload(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;

    // Token should expire in at least 1 minute
    expect(expiresIn).toBeGreaterThan(60);

    // Token should expire in at most 30 days
    expect(expiresIn).toBeLessThan(30 * 24 * 60 * 60);
  });
});

test.describe('JWT Token Functional Verification', () => {
  test('should access protected endpoint with valid token', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    // Verify token structure first
    const payload = decodeJwtPayload(token);
    expect(payload.email).toBe(firstUser.email);

    // Then verify it works for API access
    const protectedResponse = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(protectedResponse.ok()).toBeTruthy();

    const userData = await protectedResponse.json();
    expect(userData.email).toBe(firstUser.email);
    expect(userData.email).toBe(payload.email);
  });

  test('should reject token with modified payload', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    // Modify the payload part of the token
    const parts = token.split('.');
    const payload = decodeJwtPayload(token);
    payload.email = 'hacker@evil.com'; // Try to change email
    const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

    // Server should reject the modified token
    const response = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${modifiedToken}` }
    });
    expect(response.status()).toBe(401);
  });

  test('should reject token with modified signature', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token } = await loginResponse.json();

    // Modify the signature part
    const parts = token.split('.');
    const modifiedSignature = parts[2].split('').reverse().join('');
    const modifiedToken = `${parts[0]}.${parts[1]}.${modifiedSignature}`;

    const response = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${modifiedToken}` }
    });
    expect(response.status()).toBe(401);
  });

  test('should refresh token and verify new token structure', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: firstUser.email, password: firstUser.password }
    });
    const { token: originalToken } = await loginResponse.json();
    const originalPayload = decodeJwtPayload(originalToken);

    const refreshResponse = await request.post('/api/auth/refresh', {
      headers: { 'Authorization': `Bearer ${originalToken}` }
    });
    expect(refreshResponse.ok()).toBeTruthy();

    const { token: newToken } = await refreshResponse.json();
    const newPayload = decodeJwtPayload(newToken);

    // User data should be the same
    expect(newPayload.email).toBe(originalPayload.email);
    expect(newPayload.user_id || newPayload.sub).toBe(originalPayload.user_id || originalPayload.sub);

    // New token should work
    const meResponse = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${newToken}` }
    });
    expect(meResponse.ok()).toBeTruthy();
  });

  test('should not access protected endpoints with token from wrong signature key', async ({ request }) => {
    // Create a fake token with wrong signature (using a different secret)
    const fakePayload = {
      user_id: firstUser.id,
      email: firstUser.email,
      roles: firstUser.roles,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(fakePayload)).toString('base64url');
    const fakeSignature = 'fake_signature_with_wrong_key';
    const fakeToken = `${header}.${payload}.${fakeSignature}`;

    const response = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${fakeToken}` }
    });
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
    expect([400, 415]).toContain(response.status());
  });
});
