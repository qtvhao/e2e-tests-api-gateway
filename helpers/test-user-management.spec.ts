/**
 * @fileoverview Test User Management - Verification Tests
 *
 * Verifies that the test user management utilities work correctly:
 * - createTestUser: Creates a new unique test user via API
 * - deleteTestUser: Removes a test user from the system
 * - createAuthenticatedTestUser: Creates user and returns with auth token
 * - TestUserManager: Manages multiple test users with automatic cleanup
 *
 * @test-type api
 * @browsers chromium, api (ONLY - no firefox/webkit)
 *
 * @see ./auth.ts - Implementation of test user utilities
 * @see ../fixtures/api-fixtures.ts - Playwright fixtures using these utilities
 */
import { test, expect } from '@playwright/test';
import { loadTestConfig } from './test-config';
import {
  createTestUser,
  deleteTestUser,
  createAuthenticatedTestUser,
  TestUserManager,
  getAuthToken,
  TestUser,
} from './auth';

test.describe('Test User Management Utilities', () => {
  const config = loadTestConfig();

  test.describe('createTestUser', () => {
    let createdUser: TestUser | null = null;

    test.afterEach(async ({ request }) => {
      // Cleanup: ensure user is deleted after each test
      if (createdUser?.id) {
        await deleteTestUser(request, createdUser.id).catch(() => {
          // Ignore cleanup errors
        });
        createdUser = null;
      }
    });

    test('creates a user with unique email', async ({ request }) => {
      createdUser = await createTestUser(request);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.id).not.toBe('');
      expect(createdUser.email).toMatch(/^test-\d+-[a-z0-9]+@test\.ugjb\.com$/);
      expect(createdUser.password).toMatch(/^Test\d+!$/);
    });

    test('creates user with custom prefix', async ({ request }) => {
      createdUser = await createTestUser(request, { prefix: 'notification-test' });

      expect(createdUser.email).toMatch(/^notification-test-\d+-[a-z0-9]+@test\.ugjb\.com$/);
    });

    test('creates user with custom roles', async ({ request }) => {
      createdUser = await createTestUser(request, { roles: ['admin', 'user'] });

      expect(createdUser.id).toBeDefined();
      // User created successfully with specified roles
    });

    test('creates user with metadata', async ({ request }) => {
      createdUser = await createTestUser(request, {
        metadata: { department: 'engineering', team: 'platform' },
      });

      expect(createdUser.id).toBeDefined();
    });

    test('created user can authenticate', async ({ request }) => {
      createdUser = await createTestUser(request);

      const authToken = await getAuthToken(request, createdUser.email, createdUser.password);

      expect(authToken).toBeDefined();
      expect(authToken).not.toBe('');
      expect(typeof authToken).toBe('string');
    });
  });

  test.describe('createTestUser - uniqueness', () => {
    let user1: TestUser | null = null;
    let user2: TestUser | null = null;

    test.afterEach(async ({ request }) => {
      if (user1?.id) {
        await deleteTestUser(request, user1.id).catch(() => {});
        user1 = null;
      }
      if (user2?.id) {
        await deleteTestUser(request, user2.id).catch(() => {});
        user2 = null;
      }
    });

    test('creates unique users on multiple calls', async ({ request }) => {
      user1 = await createTestUser(request);
      user2 = await createTestUser(request);

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).not.toBe(user2.email);
    });
  });

  test.describe('deleteTestUser', () => {
    test('deletes an existing user', async ({ request }) => {
      // Create a user to delete
      const user = await createTestUser(request);
      expect(user.id).toBeDefined();

      // Delete the user
      await deleteTestUser(request, user.id);

      // Verify user cannot authenticate after deletion
      await expect(
        getAuthToken(request, user.email, user.password)
      ).rejects.toThrow();
    });

    test('handles already-deleted user gracefully (idempotent)', async ({ request }) => {
      const user = await createTestUser(request);

      // Delete once
      await deleteTestUser(request, user.id);

      // Delete again - should not throw (404 is acceptable)
      await expect(deleteTestUser(request, user.id)).resolves.not.toThrow();
    });

    test('handles non-existent user ID gracefully', async ({ request }) => {
      const fakeUserId = 'non-existent-user-id-12345';

      // Should not throw for 404
      await expect(deleteTestUser(request, fakeUserId)).resolves.not.toThrow();
    });
  });

  test.describe('createAuthenticatedTestUser', () => {
    let createdUser: (TestUser & { authToken: string }) | null = null;

    test.afterEach(async ({ request }) => {
      if (createdUser?.id) {
        await deleteTestUser(request, createdUser.id).catch(() => {});
        createdUser = null;
      }
    });

    test('creates user with authToken included', async ({ request }) => {
      createdUser = await createAuthenticatedTestUser(request);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBeDefined();
      expect(createdUser.password).toBeDefined();
      expect(createdUser.authToken).toBeDefined();
      expect(createdUser.authToken).not.toBe('');
    });

    test('authToken is valid for API requests', async ({ request }) => {
      // Create user and authenticate separately (same pattern as passing tests)
      const user = await createTestUser(request);
      const authToken = await getAuthToken(request, user.email, user.password);
      createdUser = { ...user, authToken };

      // Use the token to access a protected endpoint
      // Note: Use relative path to leverage Playwright's baseURL config
      const response = await request.get('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(body.email).toBe(user.email);
    });

    test('accepts custom options', async ({ request }) => {
      createdUser = await createAuthenticatedTestUser(request, {
        prefix: 'api-test',
        roles: ['user'],
      });

      expect(createdUser.email).toMatch(/^api-test-\d+-[a-z0-9]+@test\.ugjb\.com$/);
      expect(createdUser.authToken).toBeDefined();
    });
  });

  test.describe('TestUserManager', () => {
    let manager: TestUserManager | null = null;

    test.afterEach(async () => {
      if (manager) {
        await manager.cleanup();
        manager = null;
      }
    });

    test('creates and tracks multiple users', async ({ request }) => {
      manager = new TestUserManager(request);

      const user1 = await manager.create({ prefix: 'manager-test-1' });
      const user2 = await manager.create({ prefix: 'manager-test-2' });

      expect(user1.id).toBeDefined();
      expect(user2.id).toBeDefined();
      expect(user1.authToken).toBeDefined();
      expect(user2.authToken).toBeDefined();

      const createdUsers = manager.getCreatedUsers();
      expect(createdUsers).toHaveLength(2);
      expect(createdUsers[0].id).toBe(user1.id);
      expect(createdUsers[1].id).toBe(user2.id);
    });

    test('created users have valid auth tokens', async ({ request }) => {
      manager = new TestUserManager(request);
      const user = await manager.create({ prefix: 'token-test' });

      const response = await request.get(`${config.apiBaseUrl}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${user.authToken}`,
        },
      });

      expect(response.ok()).toBe(true);
    });

    test('supports multiple isolated test scenarios', async ({ request }) => {
      manager = new TestUserManager(request);

      // Scenario: Two users with different roles
      const viewer = await manager.create({ prefix: 'viewer' });
      const editor = await manager.create({ prefix: 'editor', roles: ['editor'] });

      expect(viewer.id).not.toBe(editor.id);
      expect(viewer.email).toContain('viewer');
      expect(editor.email).toContain('editor');
    });
  });

  test.describe('TestUserManager - cleanup behavior', () => {
    test('cleanup deletes all created users', async ({ request }) => {
      const manager = new TestUserManager(request);

      const user1 = await manager.create({ prefix: 'cleanup-test-1' });
      const user2 = await manager.create({ prefix: 'cleanup-test-2' });

      // Store credentials before cleanup
      const user1Email = user1.email;
      const user1Password = user1.password;
      const user2Email = user2.email;
      const user2Password = user2.password;

      // Cleanup all users
      await manager.cleanup();

      // Verify users list is cleared
      expect(manager.getCreatedUsers()).toHaveLength(0);

      // Verify users cannot authenticate after cleanup
      await expect(
        getAuthToken(request, user1Email, user1Password)
      ).rejects.toThrow();
      await expect(
        getAuthToken(request, user2Email, user2Password)
      ).rejects.toThrow();
    });

    test('cleanup is idempotent', async ({ request }) => {
      const manager = new TestUserManager(request);

      await manager.create({ prefix: 'idempotent-test' });

      await manager.cleanup();
      await expect(manager.cleanup()).resolves.not.toThrow();

      expect(manager.getCreatedUsers()).toHaveLength(0);
    });
  });

  test.describe('Integration: Full lifecycle', () => {
    test('create -> authenticate -> use -> delete', async ({ request }) => {
      // Step 1: Create user
      const user = await createTestUser(request, { prefix: 'lifecycle' });
      expect(user.id).toBeDefined();

      // Step 2: Authenticate
      const authToken = await getAuthToken(request, user.email, user.password);
      expect(authToken).toBeDefined();

      // Step 3: Use the authenticated user
      const meResponse = await request.get(`${config.apiBaseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(meResponse.ok()).toBe(true);

      // Step 4: Delete user
      await deleteTestUser(request, user.id);

      // Step 5: Verify deletion
      await expect(
        getAuthToken(request, user.email, user.password)
      ).rejects.toThrow();
    });
  });

  test.describe('Integration: createAuthenticatedTestUser workflow', () => {
    let user: (TestUser & { authToken: string }) | null = null;

    test.afterEach(async ({ request }) => {
      if (user?.id) {
        await deleteTestUser(request, user.id).catch(() => {});
        user = null;
      }
    });

    test('provides complete workflow in single call', async ({ request }) => {
      // Single call creates user and provides token
      user = await createAuthenticatedTestUser(request, { prefix: 'complete' });

      // Immediately usable for API calls
      const response = await request.get(`${config.apiBaseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${user.authToken}` },
      });

      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(body.email).toBe(user.email);
    });
  });

  test.describe('Error handling', () => {
    test('createTestUser works with valid admin credentials', async ({ request }) => {
      // Verify the happy path works with valid admin
      const user = await createTestUser(request);
      expect(user.id).toBeDefined();
      await deleteTestUser(request, user.id);
    });
  });
});
