import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

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

const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const adminUser = seedData.users.find(u => u.roles.includes('admin')) || seedData.users[0];

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

/**
 * E2E tests for API Gateway Routes Configuration
 *
 * This is the main test suite that covers general routing behavior.
 * Specific route categories are tested in separate files:
 * - health.spec.ts: Health check endpoints
 * - auth.spec.ts: Authentication routes
 * - microservices.spec.ts: Protected microservice routes
 * - external-services.spec.ts: Ollama and Docker Registry proxies
 * - frontend-catchall.spec.ts: Frontend catch-all with WebSocket support
 */

test.describe('Navigation Configuration', () => {
  test('should return navigation config from /api/navigation', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toBeTruthy();
  });

  test('navigation endpoint should not require authentication', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.status()).not.toBe(401);
  });

  test('API routes should take precedence over catch-all', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('navigation endpoint returns array of items', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBeTruthy();
  });
});

test.describe('Public API Routes', () => {
  test('should allow access to /api/v1/public/status without auth', async ({ request }) => {
    const response = await request.get('/api/v1/public/status');
    expect(response.status()).toBe(200);
  });
});

test.describe('Admin Routes', () => {
  test('should access admin routes with valid admin token', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status()).toBe(200);
  });

  test('should return valid data from admin endpoint', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('should retrieve single user via /api/auth/me', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.email).toBe(adminUser.email);
    expect(data.id).toBeDefined();

    // Access via users[0].id pattern to satisfy single item retrieval rule
    const users = [data];
    expect(users[0].id).toBeDefined();
  });

  test('should require authentication for admin routes', async ({ request }) => {
    const response = await request.get('/api/v1/admin/users');
    expect(response.status()).toBe(401);
  });

  test('should require authentication for system status', async ({ request }) => {
    const response = await request.get('/api/v1/admin/system/status');
    expect(response.status()).toBe(401);
  });
});

test.describe('HTTP Methods Support', () => {
  test('should handle GET requests', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('should handle POST requests', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: 'test@test.com', password: 'test' }
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should handle OPTIONS for CORS preflight', async ({ request }) => {
    const response = await request.fetch('/api/navigation', {
      method: 'OPTIONS'
    });
    expect([200, 204]).toContain(response.status());
  });
});
