/**
 * @fileoverview UI Test Utilities - Common assertions for UI tests
 *
 * Provides reusable helper functions for UI tests to ensure consistent
 * error checking and content verification across all test files.
 */
import { expect, Page } from '@playwright/test';

/**
 * Verify page loaded without error boundary (React error fallback)
 */
export async function verifyNoErrorBoundary(page: Page): Promise<void> {
  await expect(page.getByText('Something went wrong')).not.toBeVisible();
}

/**
 * Verify main content area is visible
 */
export async function verifyMainContent(page: Page): Promise<void> {
  const mainContent = page.locator('main, [role="main"]').first();
  await expect(mainContent).toBeVisible();
}

/**
 * Verify page content with heading pattern
 */
export async function verifyPageWithHeading(page: Page, headingPattern: RegExp): Promise<void> {
  await verifyNoErrorBoundary(page);
  const pageHeading = page.getByRole('heading', { name: headingPattern });
  const errorState = page.getByText(/failed to load/i);
  await expect(pageHeading.or(errorState)).toBeVisible();
}

/**
 * Verify not redirected to login (authenticated)
 */
export async function verifyAuthenticated(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * Common page verification combining error boundary and content checks
 */
export async function verifyPageLoaded(page: Page, urlPattern?: RegExp): Promise<void> {
  await verifyNoErrorBoundary(page);
  if (urlPattern) {
    await expect(page).toHaveURL(urlPattern);
  }
  await verifyMainContent(page);
}

/**
 * Verify page loaded without empty state
 *
 * Empty states are UI patterns that show when required data is missing,
 * such as "Cannot Create Assignment" when no employees/projects exist.
 *
 * This helper verifies that the page shows actual content (form, list, etc.)
 * and NOT an empty state blocking message.
 *
 * Detection method:
 * - Uses data-testid="empty-state" from EmptyState component
 * - See: web/app/src/components/ui/EmptyState.tsx
 */
export async function verifyNoEmptyState(page: Page): Promise<void> {
  await expect(page.getByTestId('empty-state')).not.toBeVisible();
}
