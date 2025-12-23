import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for JWT Token Structure Verification
 *
 * Tests cover:
 * - JWT format validation (header.payload.signature)
 * - JWT header verification (algorithm)
 * - JWT payload claims verification
 * - User data in JWT payload
 * - Role verification in JWT payload
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

const allUsers = seedData.users;
const firstUser = allUsers[0];

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
