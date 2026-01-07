/**
 * @fileoverview Error Logger Middleware E2E Tests - INDEX
 *
 * This file serves as an INDEX (documentation only) for the Error Logger Middleware tests.
 * The actual tests have been split into focused files following the naming convention:
 * {feature}.{concern}.spec.ts
 *
 * Derived test files:
 * - error_logger.endpoint.spec.ts  # API endpoint tests (GET, DELETE)
 * - error_logger.4xx.spec.ts       # 4xx HTTP error logging tests
 * - error_logger.structure.spec.ts # Log entry field validation tests
 * - error_logger.behavior.spec.ts  # Behavior tests (2xx exclusion, accumulation, etc.)
 *
 * Helper files:
 * - helpers/error-logger-helpers.ts # Shared test utilities
 *
 * @version 2.0.0
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Error log endpoint availability
 * - Non-2xx responses are logged
 * - Log entries contain expected fields
 * - Log clearing functionality
 * - Multiple error types (4xx, 5xx)
 *
 * Related implementation files:
 * - services/system-integration/microservices/api-gateway/middleware/error_logger.go
 * - services/system-integration/microservices/api-gateway/main.go
 *
 * NOTE: This file does NOT contain any test imports or test code.
 * It exists solely as documentation and to prevent auto-generation of stub tests.
 */

// No imports - this is an INDEX file only
// All tests are in the derived files listed above
