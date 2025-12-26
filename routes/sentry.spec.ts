/**
 * @fileoverview E2E Test Suite Index for Sentry/Bugsink Routes
 *
 * This file serves as documentation for the Sentry/Bugsink test suite structure.
 * Actual tests are organized in focused test files by domain.
 *
 * @structure
 * [sentry.spec.ts] Index/documentation - test suite organization
 * [sentry-api.spec.ts] SDK API endpoints and methods
 *
 * @test-categories
 * - Sentry SDK Endpoints: Store, Envelope, Security, Minidump
 * - HTTP Methods: POST, OPTIONS, GET (method validation)
 * - CORS Headers: Browser SDK compatibility headers
 * - Authentication: X-Sentry-Auth, query string, Authorization header
 * - Project Routing: Project ID routing and validation
 *
 * @coverage-areas
 * - Route Configuration: /sentry/* to Bugsink routing
 * - Path Prefix Stripping: /sentry/* → /* forwarding
 * - Static Assets: CSS, favicon, and static file serving
 *
 * @reference routes/external.go - SetupExternalRoutes
 *
 * @refactoring-note
 * This file was split into focused test modules to reduce file size while
 * maintaining clear organization by test domain:
 * - sentry-api.spec.ts: Core API endpoint, HTTP method, CORS, and authentication tests
 * - sentry.spec.ts (this file): Index/documentation
 *
 * This structure improves:
 * - Test maintainability (focused, single-responsibility test files)
 * - Test execution speed (can run subsets of related tests)
 * - Code clarity (each file has a clear, focused purpose)
 * - Developer experience (easier to locate and modify related tests)
 */

// Note: This file serves as documentation and test suite index.
// All actual tests are located in:
// - ./sentry-api.spec.ts
