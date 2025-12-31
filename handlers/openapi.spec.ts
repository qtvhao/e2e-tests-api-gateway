/**
 * @fileoverview OpenAPI/Swagger E2E Tests
 * @see services/system-integration/microservices/api-gateway/main.go
 * @see services/system-integration/microservices/api-gateway/docs/
 *
 * @version 1.0.0
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - OpenAPI/Swagger endpoint availability
 * - Swagger UI accessibility
 * - OpenAPI JSON specification validation
 * - API documentation structure verification
 *
 * Endpoints tested:
 * - /swagger/index.html - Swagger UI
 * - /swagger/doc.json - OpenAPI JSON specification
 * - /openapi.json - Redirect to swagger/doc.json
 */

import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../helpers/test-config';

test.describe('OpenAPI/Swagger - API Tests', () => {
  const config = loadTestConfig();
  const API_BASE_URL = config.apiBaseUrl;

  test.describe('Swagger UI Endpoint', () => {
    test('GET /swagger/index.html returns 200 and HTML content', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/index.html`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
    });

    test('GET /swagger/ returns 404 (use /swagger/index.html instead)', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/`, {
        maxRedirects: 0  // Don't follow redirects to check actual response
      });

      // gin-swagger serves at /swagger/index.html, bare /swagger/ returns 404
      expect(response.status()).toBe(404);
    });
  });

  test.describe('OpenAPI JSON Specification', () => {
    test('GET /swagger/doc.json returns valid OpenAPI JSON', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const spec = await response.json();

      // Validate OpenAPI/Swagger structure
      expect(spec).toHaveProperty('swagger');
      expect(spec.swagger).toBe('2.0');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
    });

    test('OpenAPI spec contains required info fields', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Info section validation
      expect(spec.info).toHaveProperty('title');
      expect(spec.info).toHaveProperty('version');
      expect(spec.info).toHaveProperty('description');
      expect(spec.info.title).toBe('UGJB API Gateway');
      expect(spec.info.version).toBe('1.0.0');
    });

    test('OpenAPI spec contains security definitions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Security definitions
      expect(spec).toHaveProperty('securityDefinitions');
      expect(spec.securityDefinitions).toHaveProperty('BearerAuth');
      expect(spec.securityDefinitions.BearerAuth.type).toBe('apiKey');
      expect(spec.securityDefinitions.BearerAuth.in).toBe('header');
      expect(spec.securityDefinitions.BearerAuth.name).toBe('Authorization');
    });

    test('OpenAPI spec contains health endpoints', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Health endpoints
      expect(spec.paths).toHaveProperty('/health');
      expect(spec.paths['/health']).toHaveProperty('get');
      expect(spec.paths['/health'].get.tags).toContain('Health');
    });

    test('OpenAPI spec contains authentication endpoints', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Auth endpoints
      expect(spec.paths).toHaveProperty('/api/v1/auth/login');
      expect(spec.paths['/api/v1/auth/login']).toHaveProperty('post');
      expect(spec.paths['/api/v1/auth/login'].post.tags).toContain('Authentication');

      // Other auth endpoints
      expect(spec.paths).toHaveProperty('/api/v1/auth/me');
      expect(spec.paths).toHaveProperty('/api/v1/auth/logout');
      expect(spec.paths).toHaveProperty('/api/v1/auth/refresh');
    });

    test('OpenAPI spec contains model definitions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Definitions/schemas
      expect(spec).toHaveProperty('definitions');
      // Use bracket notation for keys containing dots
      expect(spec.definitions['handlers.LoginRequest']).toBeDefined();
      expect(spec.definitions['handlers.LoginResponse']).toBeDefined();
      expect(spec.definitions['handlers.UserInfo']).toBeDefined();
    });

    test('LoginRequest definition has required fields', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      const loginRequest = spec.definitions['handlers.LoginRequest'];
      expect(loginRequest.type).toBe('object');
      expect(loginRequest.required).toContain('email');
      expect(loginRequest.required).toContain('password');
      expect(loginRequest.properties).toHaveProperty('email');
      expect(loginRequest.properties).toHaveProperty('password');
    });

    test('LoginResponse definition has expected properties', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      const loginResponse = spec.definitions['handlers.LoginResponse'];
      expect(loginResponse.type).toBe('object');
      expect(loginResponse.properties).toHaveProperty('token');
      expect(loginResponse.properties).toHaveProperty('expires_at');
      expect(loginResponse.properties).toHaveProperty('user');
    });
  });

  test.describe('OpenAPI JSON Redirect', () => {
    test('GET /openapi.json redirects to /swagger/doc.json', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/openapi.json`, {
        maxRedirects: 0  // Don't follow redirects
      });

      expect(response.status()).toBe(301);
      expect(response.headers()['location']).toBe('/swagger/doc.json');
    });

    test('GET /openapi.json (following redirects) returns valid JSON', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/openapi.json`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const spec = await response.json();
      expect(spec).toHaveProperty('swagger');
      expect(spec).toHaveProperty('info');
    });
  });

  test.describe('API Documentation Quality', () => {
    test('All documented endpoints have descriptions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Check that major endpoints have descriptions
      const pathsToCheck = [
        '/health',
        '/api/v1/auth/login',
        '/api/v1/auth/me'
      ];

      for (const path of pathsToCheck) {
        expect(spec.paths[path]).toBeDefined();
        const methods = Object.keys(spec.paths[path]);
        for (const method of methods) {
          expect(spec.paths[path][method]).toHaveProperty('description');
          expect(spec.paths[path][method]).toHaveProperty('summary');
        }
      }
    });

    test('Authenticated endpoints specify security requirements', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Auth-protected endpoints should have security defined
      const protectedEndpoints = [
        { path: '/api/v1/auth/me', method: 'get' },
        { path: '/api/v1/auth/logout', method: 'post' },
        { path: '/api/v1/auth/refresh', method: 'post' },
        { path: '/api/v1/auth/change-password', method: 'post' }
      ];

      for (const endpoint of protectedEndpoints) {
        const operation = spec.paths[endpoint.path]?.[endpoint.method];
        expect(operation).toBeDefined();
        expect(operation.security).toBeDefined();
        expect(operation.security).toContainEqual({ 'BearerAuth': [] });
      }
    });

    test('Login endpoint does NOT require authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      const loginEndpoint = spec.paths['/api/v1/auth/login']?.post;
      expect(loginEndpoint).toBeDefined();

      // Login should NOT have security requirement - security field should either be undefined or empty
      const securityRequirement = loginEndpoint.security ?? [];
      expect(securityRequirement).toHaveLength(0);
    });

    test('Endpoints have proper response definitions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/swagger/doc.json`);
      const spec = await response.json();

      // Login endpoint should define responses
      const loginEndpoint = spec.paths['/api/v1/auth/login']?.post;
      expect(loginEndpoint.responses).toHaveProperty('200');
      expect(loginEndpoint.responses).toHaveProperty('400');
      expect(loginEndpoint.responses).toHaveProperty('401');
    });
  });
});
