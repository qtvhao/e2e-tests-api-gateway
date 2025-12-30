/**
 * Seed data for consistent test users
 * Maps to services/system-integration/microservices/api-gateway/db/seed.json
 */
export const TEST_USERS = {
  admin: { email: 'admin@ugjb.com', password: 'Admin@123!' },
  user: { email: 'user@ugjb.com', password: 'User@123!' },
  test: { email: 'test@ugjb.com', password: 'Test@123!' },
  invalid: { email: 'invalid@test.com', password: 'WrongPassword123!' },
};
