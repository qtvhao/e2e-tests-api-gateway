/**
 * @fileoverview Sentry/Bugsink Proxy Handler E2E Tests
 *
 * This file has been refactored into focused, single-responsibility test files
 * to improve maintainability and test execution speed.
 *
 * Original monolithic test file has been split into:
 * - sentry_proxy_store-api.spec.ts: Route availability and error capture
 * - sentry_proxy_auth.spec.ts: Authentication and authorization
 * - sentry_proxy_validation.spec.ts: Request validation
 * - sentry_proxy_context.spec.ts: Event context (user, tags, breadcrumbs, extra)
 * - sentry_proxy_dsn.spec.ts: DSN parsing
 *
 * This structure follows the Single Responsibility Principle and allows:
 * - Faster test execution (can run specific test suites)
 * - Better code organization (each file has a clear purpose)
 * - Easier debugging (failures are isolated to specific domains)
 * - Improved team collaboration (developers work in isolated test domains)
 *
 * Note: This file is kept as a placeholder to prevent auto-generation of stub tests.
 */

// All tests have been moved to focused spec files - see file header for details
