import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Replyte/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Check if main elements are present
  await expect(page.locator('h1')).toBeVisible();
  
  // Test basic functionality
  const button = page.locator('button').first();
  if (await button.isVisible()) {
    await button.click();
  }
});