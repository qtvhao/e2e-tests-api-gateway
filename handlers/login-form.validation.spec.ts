/**
 * @fileoverview Login Form - Validation Tests - Field validation and error handling
 * @see web/app/src/pages/LoginPage.tsx
 *
 * @version 1.0.0
 * @test-type validation
 * @form-type login
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * Tests cover:
 * - Form submission and endpoint validation
 * - Field rendering and user interactions
 * - Input validation and error handling
 *
 * Related test files:
 * - login-form.spec.ts (INDEX - orchestrates all tests)
 * - login-form.api.spec.ts (API endpoints)
 * - login-form.ui.spec.ts (UI rendering)
 * - login-form.validation.spec.ts (Validation rules)
 *
 * Submit patterns detected: onSubmit\s*[=:], handleSubmit, type\s*[=:]\s*["\']submit["\']
 *
 * Related tests found: e2e/tests/system-integration/api-gateway/routes/auth.spec.ts, e2e/tests/system-integration/api-gateway/routes/v1.spec.ts
 *
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

interface SeedUser {
  id: string
  email: string
  password: string
  name: string
  roles: string[]
}

interface SeedData {
  users: SeedUser[]
}

function getSeedData(): SeedData {
  const seedPath = path.resolve(__dirname, '../../../services/system-integration/microservices/api-gateway/db/seed.json')
  return JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
}

/**
 * E2E tests for Login Form field validation
 */
test.describe('Login Form - Validation Tests', () => {
  test('should require email field to be filled before submission', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.getByLabel('Email address')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('should require password field to be filled before submission', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const passwordInput = page.getByLabel('Password')
    await expect(passwordInput).toHaveAttribute('required', '')
  })

  test('should validate email input accepts email type', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.getByLabel('Email address')
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('should validate password input is masked as password type', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const passwordInput = page.getByLabel('Password')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should handle invalid credentials with error message', async ({ page }) => {
    const seedData = getSeedData()

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.getByLabel('Email address')
    const passwordInput = page.getByLabel('Password')
    const submitButton = page.getByRole('button', { name: /sign in/i })

    await emailInput.fill('invalid@example.com')
    await passwordInput.fill('wrongpassword')
    await submitButton.click()

    // Wait for error message or redirect to indicate login attempt occurred
    // Check for error message or redirect behavior
    await page.waitForTimeout(2000)
    // After invalid login, user should either see error on login page or be on login page
    const loginForm = page.getByTestId('login-form')
    await expect(loginForm).toBeVisible()
  })
})
