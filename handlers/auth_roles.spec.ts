import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E tests for Role-Based Access and Seeded User Login
 *
 * Tests cover:
 * - Role-based access (dynamically generated from seed.json)
 * - All seeded users login verification
 *
 * Uses seeded credentials from: services/system-integration/microservices/api-gateway/db/seed.json
 */

interface SeedUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: string[];
}

interface SeedData {
  users: SeedUser[];
}

// Load test users from seed.json
const seedPath = path.resolve(__dirname, '../../../../../services/system-integration/microservices/api-gateway/db/seed.json');
const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

// Get all users
const allUsers = seedData.users;

// Extract all unique roles from seed data
const allRoles = [...new Set(allUsers.flatMap(u => u.roles))];

// Map: role -> first user that has this role
const userByRole = new Map<string, SeedUser>();
for (const role of allRoles) {
  const user = allUsers.find(u => u.roles.includes(role));
  if (user) {
    userByRole.set(role, user);
  }
}

// Dynamically generate role-based access tests for each unique role
test.describe('Role-Based Access', () => {
  for (const role of allRoles) {
    const user = userByRole.get(role)!;

    test(`should assign "${role}" role for user ${user.email}`, async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: user.email,
          password: user.password
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.user).toHaveProperty('roles');
      expect(Array.isArray(data.user.roles)).toBeTruthy();
      expect(data.user.roles).toContain(role);
    });
  }
});

// Dynamically test login for all seeded users
test.describe('All Seeded Users Login', () => {
  for (const user of allUsers) {
    test(`should login successfully as ${user.name} (${user.email})`, async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: user.email,
          password: user.password
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.user.email).toBe(user.email);
      expect(data.user.name).toBe(user.name);
      expect(data.user.roles).toEqual(expect.arrayContaining(user.roles));
    });
  }
});
