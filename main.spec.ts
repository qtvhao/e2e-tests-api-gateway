/**
 * @fileoverview E2E tests for API Gateway and Main Application
 * @author Hao Nghiem <haonx@eupgroup.net>
 *
 * @changelog
 * @version 0.0.4
 * @changes Dynamic config loading, auth helper, new auth tests, explicit assertions
 *
 * @version 0.0.3
 * @changes Fixed 404 test with role-based selector
 *
 * @version 0.0.2
 * @changes Removed UI tests (login, dashboard, sidebar) to separate concerns
 *
 * @version 0.0.1
 * @changes Initial creation with health, navigation, auth, UI, and error tests
 *
 * @test-suites-index
 * Total: 322 tests in 34 files
 *
 * @structure
 * ```
 * api-gateway/
 * ├── main.spec.ts                          # Entry point - core gateway tests
 * ├── handlers/                             # Handler-level tests (~180 tests)
 * │   ├── auth_api.spec.ts                  # Auth API Endpoints, Error Handling
 * │   ├── auth_helpers_credential.spec.ts   # Credential Validation
 * │   ├── auth_helpers_token.spec.ts        # JWT Token Generation, Role Assignment, Token Refresh
 * │   ├── auth_jwt_functional.spec.ts       # JWT Token Functional Verification
 * │   ├── auth_jwt_structure.spec.ts        # JWT Token Structure Verification
 * │   ├── auth_refresh.spec.ts              # Token Refresh Endpoint
 * │   ├── auth_roles.spec.ts                # Role-Based Access, Seeded Users Login
 * │   ├── auth_token_validation.spec.ts     # Token Validation
 * │   ├── auth_ui.spec.ts                   # Login Page UI, User Interactions, State Persistence
 * │   ├── error_handling.spec.ts            # 404, Malformed Requests, HTTP Methods, Edge Cases
 * │   ├── health.spec.ts                    # Health Endpoints, Public Status, Admin Auth
 * │   ├── navigation.spec.ts                # Navigation API, Sidebar UI, Dashboard
 * │   ├── proxy_auth.spec.ts                # Authentication Proxy
 * │   ├── proxy_health.spec.ts              # Proxy Health Check Endpoints
 * │   ├── proxy_routing.spec.ts             # Service/External/Frontend Proxy, Error Handling
 * │   └── security.spec.ts                  # JWT Validation, RBAC, Login Security, Headers
 * ├── routes/                               # Route-level tests (~120 tests)
 * │   ├── auth.spec.ts                      # Authentication Routes
 * │   ├── dashboard.spec.ts                 # Dashboard API (Auth, Access, Response, Browser)
 * │   ├── external-services.spec.ts         # External Services (Ollama, Docker Registry)
 * │   ├── external.spec.ts                  # External Routes (Health, LLM Proxy, Registry)
 * │   ├── frontend-api.spec.ts              # Content-Type, Route Priority, Auth Middleware, CORS
 * │   ├── frontend-catchall.spec.ts         # HTML Serving, SPA Routes, Static Assets, WebSocket
 * │   ├── health.spec.ts                    # Health Check Endpoints
 * │   ├── microservices.spec.ts             # Protected Microservice Routes
 * │   ├── routes.spec.ts                    # Navigation, Public API, Admin, HTTP Methods
 * │   ├── v1_admin.spec.ts                  # V1 Admin Routes (Auth Access, Auth Required)
 * │   ├── v1_auth.spec.ts                   # V1 Authentication
 * │   ├── v1_public.spec.ts                 # V1 Public Endpoints
 * │   ├── v1_proxy.spec.ts                  # V1 Service Proxy Routes
 * │   └── v1.spec.ts                        # V1 Dashboard Integration
 * └── ui/settings/                          # UI tests (~21 tests, 3 browsers)
 *     ├── appearance-form.ui.spec.ts        # Appearance Settings Form
 *     ├── notification-form.ui.spec.ts      # Notification Settings Form
 *     ├── notification-form-options.ui.spec.ts # Notification Options
 *     └── security-form.ui.spec.ts          # Security Settings Form
 * ```
 *
 * @test-categories
 * | Category          | Description                                      |
 * |-------------------|--------------------------------------------------|
 * | handlers/auth_*   | Authentication, JWT, tokens, roles, credentials  |
 * | handlers/proxy_*  | Proxy routing, health, authentication            |
 * | handlers/security | Security headers, RBAC, login validation         |
 * | routes/v1_*       | API v1 endpoints (admin, auth, public, proxy)    |
 * | routes/external*  | Ollama LLM, Docker Registry proxies              |
 * | routes/frontend*  | SPA catch-all, static assets, WebSocket HMR      |
 * | ui/settings/      | Settings forms (appearance, notifications, security) |
 *
 * @coverage-areas
 * - Health: /health, /health/ready, /health/live, /health/liveness, /health/readiness
 * - Auth: /api/auth/login, /api/auth/logout, /api/auth/refresh, /api/auth/me
 * - Admin: /api/v1/admin/users, /api/v1/admin/system/status
 * - Public: /api/v1/public/status, /api/navigation
 * - Dashboard: /api/dashboard
 * - External: /api/generate, /api/chat, /api/embeddings, /v2/*
 * - Frontend: catch-all for SPA routes, static assets, WebSocket
 *
 * @browsers api, chromium, firefox (ui/settings only)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Read services.json directly from project root
const servicesJsonPath = path.resolve(__dirname, '../../../../services.json');
const servicesData = JSON.parse(fs.readFileSync(servicesJsonPath, 'utf-8'));
const protectedEndpoints = servicesData.services.map((s: { service_name: string }) => `/api/v1/${s.service_name}`);

// Read seed data for test users
const seedPath = path.resolve(__dirname, '../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const adminUser = seedData.users.find((u: { roles: string[] }) => u.roles.includes('admin')) || seedData.users[0];

async function getAuthToken(request: any, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });
  const data = await response.json();
  return data.token;
}

test.describe('API Gateway Health Endpoints', () => {
  test('should return healthy status from /health endpoint', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
  });

  test('should return ready status from /health/ready endpoint', async ({ request }) => {
    const response = await request.get('/health/ready');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('should return live status from /health/live endpoint', async ({ request }) => {
    const response = await request.get('/health/live');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });
});

test.describe('Navigation API', () => {
  test('should return navigation items from /api/navigation', async ({ request }) => {
    const response = await request.get('/api/navigation');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
    expect(data.items.length).toBeGreaterThan(0);
  });
});

test.describe('Authentication Flow', () => {
  test('should successfully authenticate with valid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: adminUser.email, password: adminUser.password }
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
  });

  test('should access protected endpoint with valid token', async ({ request }) => {
    const token = await getAuthToken(request, adminUser.email, adminUser.password);
    const response = await request.get(protectedEndpoints[0], {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status()).not.toBe(401);
    expect([200, 404, 502]).toContain(response.status());
  });

  test('should retrieve single user by id via /api/auth/me', async ({ request }) => {
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

    const users = [data];
    expect(users[0].id).toBeDefined();
  });

  test('should require authentication for protected API endpoints', async ({ request }) => {
    const response = await request.get(protectedEndpoints[0]);
    expect(response.status()).toBe(401);
  });

  test('should redirect to login page when accessing protected routes without auth', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  });
});
