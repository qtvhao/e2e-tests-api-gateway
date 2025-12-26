/**
 * @fileoverview Login Form - API Tests - Form submission endpoints and response validation
 * @see web/app/src/pages/LoginPage.tsx
 *
 * @version 1.0.0
 * @test-type api
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
 * E2E tests for Login Form API endpoints
 */
test.describe('Login Form - API Tests', () => {
  test('should successfully submit login form to /api/auth/login endpoint', async ({ request }) => {
    const seedData = getSeedData()
    const testUser = seedData.users.find(u => u.roles.includes('user')) || seedData.users[0]

    const response = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    })

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toBeDefined()
    expect(data.token).toBeDefined()
    expect(typeof data.token).toBe('string')
    expect(data.token.length).toBeGreaterThan(0)

    // Verify user data structure
    expect(data.user).toBeDefined()
    expect(Array.isArray(data.user.roles)).toBeTruthy()
    expect(data.user.roles.length).toBeGreaterThan(0)
  })

  test('should return error status for invalid email/password combination', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      }
    })

    expect(response.status()).toBe(401)
  })

  test('should return error for missing email field', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        password: 'somepassword'
      }
    })

    expect([400, 401]).toContain(response.status())
  })

  test('should return error for missing password field', async ({ request }) => {
    const seedData = getSeedData()
    const testUser = seedData.users.find(u => u.roles.includes('user')) || seedData.users[0]

    const response = await request.post('/api/auth/login', {
      data: {
        email: testUser.email
      }
    })

    expect([400, 401]).toContain(response.status())
  })

  test('should retrieve authenticated user profile after successful login', async ({ request }) => {
    const seedData = getSeedData()
    const testUser = seedData.users.find(u => u.roles.includes('user')) || seedData.users[0]

    // First login to get token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    })

    expect(loginResponse.status()).toBe(200)
    const loginData = await loginResponse.json()

    // Then retrieve user profile using the token (single user retrieval by ID: /api/auth/users/:id)
    const userResponse = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${loginData.token}` }
    })

    expect(userResponse.ok()).toBeTruthy()
    expect(userResponse.status()).toBe(200)

    const userData = await userResponse.json()
    expect(userData).toBeDefined()
    expect(userData.id).toBeDefined()
    expect(userData.email).toBe(testUser.email)
  })
})
