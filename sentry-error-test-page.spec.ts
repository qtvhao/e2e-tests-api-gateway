/**
 * Sentry SDK - ErrorTestPage Integration Tests
 *
 * REFACTORED: This file has been split into focused test modules for better maintainability.
 *
 * Individual test suites are located in the ./sentry/ directory:
 * - sentry/manual-error-capture.spec.ts: Manual error capture tests
 * - sentry/fatal-error-capture.spec.ts: Fatal error tests
 * - sentry/error-boundary.spec.ts: React ErrorBoundary integration tests
 * - sentry/runtime-errors.spec.ts: TypeError/ReferenceError tests
 * - sentry/async-errors.spec.ts: Async error and promise rejection tests
 * - sentry/api-errors.spec.ts: API error tracking tests
 * - sentry/envelope-api.spec.ts: Sentry envelope format tests
 * - sentry/error-context.spec.ts: Error context and breadcrumbs tests
 * - sentry/error-severity.spec.ts: Error severity level tests
 *
 * Shared utilities: helpers/sentry-test-utils.ts
 *
 * Tests cover:
 * - Manual error capture via errorTracker.captureException()
 * - Fatal error capture with severity level
 * - API error tracking
 * - React ErrorBoundary integration
 * - TypeError/runtime exceptions
 * - Uncaught async errors
 * - Unhandled promise rejections
 * - Error context and breadcrumbs
 * - Error severity levels
 *
 * Reference: web/app/src/pages/ErrorTestPage.tsx
 * Reference: web/app/src/lib/error-tracking.ts
 */
