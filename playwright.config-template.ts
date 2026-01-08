import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validate required environment variables
const colimaVmUrl = process.env.COLIMA_VM_URL;
const apiBaseUrl = process.env.API_BASE_URL;

if (!colimaVmUrl && !apiBaseUrl) {
  throw new Error(
    'COLIMA_VM_URL or API_BASE_URL environment variable must be set.\n' +
    'Example: export COLIMA_VM_URL=http://192.168.64.2:8080\n' +
    'Or set it in your .env file.'
  );
}

const resolvedApiBaseUrl = apiBaseUrl || `${colimaVmUrl}:8080`;

/**
 * Playwright E2E Test Configuration
 *
 * This configuration is designed to test the microservices architecture
 * including API Gateway, backend services, and frontend UI.
 */

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests (helps with flaky network/timing issues)
  retries: process.env.CI ? 2 : 1,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : 1,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Global timeout for tests
  timeout: 10000,

  // Shared settings for all projects
  use: {
    // Base URL for API tests - points to API Gateway
    baseURL: resolvedApiBaseUrl,

    // Collect trace when retrying a failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for different test types
  // Note: Only api and chromium are enabled for faster test execution
  projects: [
    // API tests - no browser needed
    {
      name: 'api',
      testMatch: /.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // UI tests - Desktop Chrome
    {
      name: 'chromium',
      testMatch: /.*\.ui\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.FRONTEND_URL || resolvedApiBaseUrl,
      },
    },
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Web server configuration (optional - for running frontend during tests)
  // webServer: {
  //   command: 'npm run dev',
  //   cwd: '../web/app',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
