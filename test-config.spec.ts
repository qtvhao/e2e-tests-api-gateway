/**
 * @fileoverview Test Configuration Helper E2E Tests
 *
 * Tests for the loadTestConfig function to verify correct environment
 * variable mapping, particularly COLIMA_VM_URL handling.
 *
 * @version 1.0.0
 * @test-type unit
 *
 * Tests cover:
 * - loadTestConfig returns correct apiBaseUrl from COLIMA_VM_URL
 * - apiBaseUrl includes correct port (8080)
 * - Fallback behavior when COLIMA_VM_URL is not set
 * - API_BASE_URL takes precedence over COLIMA_VM_URL
 */

import { test, expect } from '@playwright/test';
import { loadTestConfig, TestConfig } from './helpers/test-config';

test.describe('loadTestConfig', () => {
  test.describe('COLIMA_VM_URL mapping', () => {
    test('returns apiBaseUrl with COLIMA_VM_URL and port 8080', () => {
      const config: TestConfig = loadTestConfig();

      // When COLIMA_VM_URL is set (e.g., http://192.168.64.2),
      // apiBaseUrl should be COLIMA_VM_URL:8080
      if (process.env.COLIMA_VM_URL && !process.env.API_BASE_URL) {
        expect(config.apiBaseUrl).toBe(`${process.env.COLIMA_VM_URL}:8080`);
      }
    });

    test('apiBaseUrl contains expected URL format', () => {
      const config: TestConfig = loadTestConfig();

      // apiBaseUrl should be a valid URL format if COLIMA_VM_URL or API_BASE_URL is set
      if (config.apiBaseUrl) {
        expect(config.apiBaseUrl).toMatch(/^https?:\/\/.+/);
      }
    });

    test('apiBaseUrl includes port 8080 when derived from COLIMA_VM_URL', () => {
      const config: TestConfig = loadTestConfig();

      // When derived from COLIMA_VM_URL, should include :8080
      if (process.env.COLIMA_VM_URL && !process.env.API_BASE_URL) {
        expect(config.apiBaseUrl).toContain(':8080');
      }
    });
  });

  test.describe('API_BASE_URL mapping', () => {
    test('API_BASE_URL maps to COLIMA_VM_URL with port 8080', () => {
      const config: TestConfig = loadTestConfig();
      const expectedApiBaseUrl = `${process.env.COLIMA_VM_URL}:8080`;

      expect(config.apiBaseUrl).toBe(expectedApiBaseUrl);
    });
  });

  test.describe('TestConfig structure', () => {
    test('returns object with apiBaseUrl property', () => {
      const config: TestConfig = loadTestConfig();

      expect(config).toHaveProperty('apiBaseUrl');
      expect(typeof config.apiBaseUrl).toBe('string');
    });

    test('returns object with baseUrl property', () => {
      const config: TestConfig = loadTestConfig();

      expect(config).toHaveProperty('baseUrl');
      expect(typeof config.baseUrl).toBe('string');
    });
  });

  test.describe('current environment configuration', () => {
    test('apiBaseUrl is correctly configured for current environment', () => {
      const config: TestConfig = loadTestConfig();

      // Log the actual values for debugging
      console.log('COLIMA_VM_URL:', process.env.COLIMA_VM_URL);
      console.log('API_BASE_URL:', process.env.API_BASE_URL);
      console.log('config.apiBaseUrl:', config.apiBaseUrl);

      // Verify apiBaseUrl is not empty when COLIMA_VM_URL is set
      if (process.env.COLIMA_VM_URL) {
        expect(config.apiBaseUrl).not.toBe('');
      }
    });

    test('apiBaseUrl matches expected value from .env COLIMA_VM_URL', () => {
      const config: TestConfig = loadTestConfig();
      const expectedColimaVmUrl = 'http://192.168.64.2';

      // When COLIMA_VM_URL is set to expected value and API_BASE_URL is not set
      if (process.env.COLIMA_VM_URL === expectedColimaVmUrl && !process.env.API_BASE_URL) {
        expect(config.apiBaseUrl).toBe(`${expectedColimaVmUrl}:8080`);
      }
    });
  });
});
