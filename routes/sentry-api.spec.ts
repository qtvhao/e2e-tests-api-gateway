/**
 * @fileoverview E2E Test Suite Index for Sentry API Tests
 *
 * This file serves as documentation for the Sentry API test suite structure.
 * Actual tests are organized in focused test files by concern.
 *
 * @structure
 * [sentry-api.spec.ts] Index/documentation - test suite organization
 * [sentry-endpoints.spec.ts] SDK event submission endpoints (store, envelope, security, minidump)
 * [sentry-auth.spec.ts] Authentication methods and project routing
 *
 * @refactoring-note
 * This file was split into focused test modules to reduce file size while
 * maintaining clear organization by test domain:
 * - sentry-endpoints.spec.ts: SDK endpoints, HTTP methods, CORS headers
 * - sentry-auth.spec.ts: Authentication methods and project routing
 * - sentry-api.spec.ts (this file): Index/documentation
 * - sentry.spec.ts: Higher-level route configuration tests
 *
 * This structure improves:
 * - Test maintainability (focused, single-responsibility test files)
 * - Test execution speed (can run subsets of related tests)
 * - Code clarity (each file has a clear, focused purpose)
 * - Developer experience (easier to locate and modify related tests)
 */

// Note: This file serves as documentation and test suite index.
// All actual tests are located in:
// - ./sentry-endpoints.spec.ts
// - ./sentry-auth.spec.ts
