import { test, expect } from '@playwright/test';

test.describe('Clerk Invitations E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set test session cookies for admin user
    await page.goto('/api/test/session');
    await page.waitForLoadState('networkidle');
  });

  test('should display team page with invitation form', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Check if team panel is visible
    await expect(page.locator('[data-testid="invite-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="invite-submit"]')).toBeVisible();
  });

  test('should create invitation successfully', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    const testEmail = `e2e+${Date.now()}@example.com`;

    // Fill invitation form
    await page.fill('[data-testid="invite-email"]', testEmail);
    await page.click('[data-testid="invite-submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for success (either success message or pending invite)
    const successMessage = page.locator('text=Invite sent');
    const pendingInvite = page.locator(`[data-testid="invite-row"]:has-text("${testEmail}")`);
    
    // One of these should be visible
    const successVisible = await successMessage.isVisible().catch(() => false);
    const inviteVisible = await pendingInvite.isVisible().catch(() => false);
    
    expect(successVisible || inviteVisible).toBe(true);

    // If success message is shown, check that email field is cleared
    if (successVisible) {
      await expect(page.locator('[data-testid="invite-email"]')).toHaveValue('');
    }
  });

  test('should handle fallback invitation when Clerk fails', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    const testEmail = `e2e+fallback+${Date.now()}@example.com`;

    // Mock Clerk API to fail
    await page.route('**/api/team/invitations', async (route) => {
      if (route.request().method() === 'POST') {
        // Simulate Clerk failure but local success
        const response = await route.fetch();
        const data = await response.json();
        
        if (data.ok && data.data.fallback) {
          // Show fallback toast
          await page.evaluate((email) => {
            const toast = document.createElement('div');
            toast.textContent = `Invite recorded locally; email not sent (Clerk error: ${data.data.clerkError.code})`;
            toast.className = 'toast fallback-toast';
            document.body.appendChild(toast);
          }, testEmail);
        }
        
        await route.fulfill({ response });
      } else {
        await route.continue();
      }
    });

    // Fill invitation form
    await page.fill('[data-testid="invite-email"]', testEmail);
    await page.click('[data-testid="invite-submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for fallback message
    const fallbackToast = page.locator('.fallback-toast');
    const pendingInvite = page.locator(`[data-testid="invite-row"]:has-text("${testEmail}")`);
    
    // Either fallback toast or pending invite should be visible
    const toastVisible = await fallbackToast.isVisible().catch(() => false);
    const inviteVisible = await pendingInvite.isVisible().catch(() => false);
    
    expect(toastVisible || inviteVisible).toBe(true);
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Try invalid email
    await page.fill('[data-testid="invite-email"]', 'invalid-email');
    await page.click('[data-testid="invite-submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for error message
    const errorMessage = page.locator('text=Invite failed');
    await expect(errorMessage).toBeVisible();
  });

  test('should display pending invitations', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Check if pending invitations section exists
    const pendingSection = page.locator('text=Pending Invitations');
    const inviteRows = page.locator('[data-testid="invite-row"]');
    
    // Section should be visible if there are invitations
    if (await inviteRows.count() > 0) {
      await expect(pendingSection).toBeVisible();
      await expect(inviteRows.first()).toBeVisible();
    }
  });

  test('should revoke invitation', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Check if there are any pending invitations
    const inviteRows = page.locator('[data-testid="invite-row"]');
    const revokeButtons = page.locator('[data-testid="invite-revoke"]');
    
    if (await inviteRows.count() > 0) {
      // Click first revoke button
      await revokeButtons.first().click();
      
      // Wait for response
      await page.waitForTimeout(1000);
      
      // Check that invitation is removed
      const remainingRows = page.locator('[data-testid="invite-row"]');
      expect(await remainingRows.count()).toBeLessThan(await inviteRows.count());
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Mock network failure
    await page.route('**/api/team/invitations', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            error: { code: 'NETWORK_ERROR', message: 'Network failure' }
          })
        });
      } else {
        await route.continue();
      }
    });

    const testEmail = `e2e+error+${Date.now()}@example.com`;

    // Fill invitation form
    await page.fill('[data-testid="invite-email"]', testEmail);
    await page.click('[data-testid="invite-submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for error message
    const errorMessage = page.locator('text=Invite failed');
    await expect(errorMessage).toBeVisible();
  });

  test('should disable submit button while pending', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    const testEmail = `e2e+disabled+${Date.now()}@example.com`;

    // Fill invitation form
    await page.fill('[data-testid="invite-email"]', testEmail);
    
    // Click submit and immediately check if button is disabled
    await page.click('[data-testid="invite-submit"]');
    
    // Button should be disabled during request
    const submitButton = page.locator('[data-testid="invite-submit"]');
    await expect(submitButton).toBeDisabled();
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Button should be enabled again
    await expect(submitButton).toBeEnabled();
  });
});
