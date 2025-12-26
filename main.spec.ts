/**
 * @fileoverview E2E Test Suite Index for API Gateway
 *
 * This file serves as documentation for the complete E2E test suite structure.
 * Actual tests are organized in focused test files by concern/domain.
 *
 * @author Hao Nghiem <qtvhao@gmail.com>
 *
 * @changelog
 * @version 0.0.5
 * @changes Converted to index/documentation file - tests split across focused modules
 *
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
 * [root] main.spec.ts: Index/documentation - test suite organization
 *
 * [handlers] ~180 tests - Handler/middleware layer tests
 * - auth_api.spec.ts: Auth API Endpoints, Error Handling
 * - auth_helpers_credential.spec.ts: Credential Validation
 * - auth_helpers_token.spec.ts: JWT Token Generation, Role Assignment, Token Refresh
 * - auth_jwt_functional.spec.ts: JWT Token Functional Verification
 * - auth_jwt_structure.spec.ts: JWT Token Structure Verification
 * - auth_refresh.spec.ts: Token Refresh Endpoint
 * - auth_refresh_auth.spec.ts: Authentication Requirements for Token Refresh
 * - auth_refresh_data.spec.ts: Data Validation for Token Refresh
 * - auth_refresh_success.spec.ts: Successful Token Refresh Operations
 * - auth_roles.spec.ts: Role-Based Access, Seeded Users Login
 * - auth_token_validation.spec.ts: Token Validation
 * - auth_ui.spec.ts: Login Page UI, User Interactions, State Persistence
 * - error_handling.spec.ts: 404, Malformed Requests, HTTP Methods, Edge Cases
 * - health.spec.ts: Health Endpoints, Public Status, Admin Auth
 * - navigation.spec.ts: Navigation API, Sidebar UI, Dashboard
 * - proxy_auth.spec.ts: Authentication Proxy
 * - proxy_health.spec.ts: Proxy Health Check Endpoints
 * - proxy_routing.spec.ts: Service/External/Frontend Proxy, Error Handling
 * - security.spec.ts: JWT Validation, RBAC, Login Security, Headers
 *
 * [routes] ~120 tests - Route/endpoint tests
 * - auth.spec.ts: Authentication Routes
 * - dashboard.spec.ts: Dashboard API (Auth, Access, Response, Browser)
 * - external-services.spec.ts: External Services (Ollama, Docker Registry)
 * - external.spec.ts: External Routes (Health, LLM Proxy, Registry)
 * - frontend-api.spec.ts: Content-Type, Route Priority, Auth Middleware, CORS
 * - frontend-catchall.spec.ts: HTML Serving, SPA Routes, Static Assets, WebSocket
 * - health.spec.ts: Health Check Endpoints
 * - microservices.spec.ts: Protected Microservice Routes
 * - routes.spec.ts: Navigation, Public API, Admin, HTTP Methods
 * - v1_admin.spec.ts: V1 Admin Routes (Auth Access, Auth Required)
 * - v1_auth.spec.ts: V1 Authentication
 * - v1_public.spec.ts: V1 Public Endpoints
 * - v1_proxy.spec.ts: V1 Service Proxy Routes
 * - v1.spec.ts: V1 Dashboard Integration
 *
 * [ui/settings] ~21 tests - UI component tests
 * - appearance-form.ui.spec.ts: Appearance Settings Form
 * - notification-form.ui.spec.ts: Notification Settings Form
 * - notification-form-options.ui.spec.ts: Notification Options
 * - security-form.ui.spec.ts: Security Settings Form
 *
 * [ui/...] Additional UI tests
 * - Various page/component UI tests
 *
 * @test-categories
 * - handlers/auth_*: Authentication, JWT, tokens, roles, credentials
 * - handlers/proxy_*: Proxy routing, health, authentication
 * - handlers/security: Security headers, RBAC, login validation
 * - routes/v1_*: API v1 endpoints (admin, auth, public, proxy)
 * - routes/external*: Ollama LLM, Docker Registry proxies
 * - routes/frontend*: SPA catch-all, static assets, WebSocket HMR
 * - ui/settings/: Settings forms (appearance, notifications, security)
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
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * @refactoring-note
 * This file was converted from a monolithic test file to an index/documentation file
 * to follow the Single Responsibility Principle. Individual tests are located in
 * focused test files organized by domain/concern:
 * - handlers/: Middleware and handler layer tests
 * - routes/: HTTP route and endpoint tests
 * - ui/: React component and UI tests
 * - sentry/: Error reporting integration tests
 *
 * This structure improves:
 * - Test maintainability (changes to one domain only affect related tests)
 * - Test execution speed (can run subsets of tests)
 * - Code clarity (each file has a clear, focused purpose)
 * - Team collaboration (developers work in isolated test domains)
 */

// Note: This file serves as documentation and test suite index.
// All actual tests are located in the subdirectories:
// - ./handlers/*.spec.ts
// - ./routes/*.spec.ts
// - ./ui/**/*.spec.ts
// - ./sentry/*.spec.ts
