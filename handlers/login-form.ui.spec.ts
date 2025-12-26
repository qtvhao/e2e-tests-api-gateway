/**
 * @fileoverview Login Form - UI Tests - Form field rendering and user interactions
 * @see web/app/src/pages/LoginPage.tsx
 *
 * @version 1.0.0
 * @test-type ui
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
 * E2E tests for Login Form UI rendering and user interactions
 */
test.describe('Login Form - UI Tests', () => {
  test('should render login form with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const loginForm = page.getByTestId('login-form')
    await expect(loginForm).toBeVisible()

    const emailInput = page.getByLabel('Email address')
    const passwordInput = page.getByLabel('Password')
    const submitButton = page.getByRole('button', { name: /sign in/i })

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
  })

  test('should allow user to enter email and password', async ({ page }) => {
    const seedData = getSeedData()
    const testUser = seedData.users.find(u => u.roles.includes('user')) || seedData.users[0]

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.getByLabel('Email address')
    const passwordInput = page.getByLabel('Password')

    await emailInput.fill(testUser.email)
    await passwordInput.fill(testUser.password)

    await expect(emailInput).toHaveValue(testUser.email)
    await expect(passwordInput).toHaveValue(testUser.password)
  })

  test('should display welcome heading on login page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const heading = page.getByRole('heading', { name: /welcome to ugjb/i })
    await expect(heading).toBeVisible()
  })

  test('should display submit button with correct text', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const submitButton = page.getByRole('button', { name: /sign in/i })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toHaveAttribute('type', 'submit')
  })
})
