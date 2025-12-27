/**
 * @fileoverview Login Form - INDEX - Main test suite orchestrator (imports api, ui, validation tests)
 * @see web/app/src/pages/LoginPage.tsx
 *
 * @version 1.0.0
 * @test-type spec
 * @form-type login
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * This INDEX file orchestrates all modular test suites:
 * - login-form.api.spec.ts (API endpoints)
 * - login-form.ui.spec.ts (UI rendering)
 * - login-form.validation.spec.ts (Validation rules)
 *
 * Submit patterns detected: onSubmit\s*[=:], handleSubmit, type\s*[=:]\s*["\']submit["\']
 *
 * Related tests found: e2e/tests/system-integration/api-gateway/routes/frontend-catchall.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/auth_ui.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/navigation.spec.ts
- e2e/tests/system-integration/api-gateway/routes/v1.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/auth_roles.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/login-form.validation.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/login-form.api.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/error_handling_methods.spec.ts
- e2e/tests/system-integration/api-gateway/routes/auth.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/auth_refresh_data.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/proxy_auth.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/auth_api.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/login-form.ui.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/health.spec.ts
- e2e/tests/system-integration/api-gateway/handlers/security_login.spec.ts
 *
 */

// import './login-form.api.spec';
// import './login-form.ui.spec';
// import './login-form.validation.spec';
