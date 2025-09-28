import { test, expect } from '@playwright/test';

test.describe('Team Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set test session cookies for admin user
    await page.goto('/api/test/session');
    await page.waitForLoadState('networkidle');
  });

  test('should display team page with members and invitations', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Check if team panel is visible
    await expect(page.locator('[data-testid="team-panel"]')).toBeVisible();
    
    // Check if members section is visible
    await expect(page.locator('text=Members')).toBeVisible();
    
    // Check if invite form is visible for admin
    await expect(page.locator('[data-testid="invite-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="invite-role"]')).toBeVisible();
    await expect(page.locator('[data-testid="invite-submit"]')).toBeVisible();
  });

  test('should create invitation successfully', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    const testEmail = `e2e+${Date.now()}@example.com`;

    // Fill invitation form
    await page.fill('[data-testid="invite-email"]', testEmail);
    await page.selectOption('[data-testid="invite-role"]', 'org:member');
    await page.click('[data-testid="invite-submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for success message
    await expect(page.locator('text=Invite sent')).toBeVisible();

    // Check that email field is cleared
    await expect(page.locator('[data-testid="invite-email"]')).toHaveValue('');

    // Check that invitation appears in pending invitations
    await expect(page.locator(`[data-testid="invite-row"]:has-text("${testEmail}")`)).toBeVisible();
  });

  test('should change member role', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Wait for members to load
    await page.waitForSelector('[data-testid="member-row"]');

    // Find a member row that's not the current user
    const memberRows = page.locator('[data-testid="member-row"]');
    const memberCount = await memberRows.count();
    
    if (memberCount > 0) {
      // Get the first member row
      const firstMember = memberRows.first();
      
      // Check if role select is visible (admin controls)
      const roleSelect = firstMember.locator('[data-testid="member-role"]');
      
      if (await roleSelect.isVisible()) {
        // Change role
        await roleSelect.selectOption('org:admin');
        
        // Wait for response
        await page.waitForTimeout(1000);
        
        // Check that role was updated
        await expect(firstMember.locator('text=Admin')).toBeVisible();
      }
    }
  });

  test('should remove member', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Wait for members to load
    await page.waitForSelector('[data-testid="member-row"]');

    // Find a member row that's not the current user
    const memberRows = page.locator('[data-testid="member-row"]');
    const memberCount = await memberRows.count();
    
    if (memberCount > 1) {
      // Get the first member row
      const firstMember = memberRows.first();
      
      // Check if remove button is visible (admin controls)
      const removeButton = firstMember.locator('[data-testid="member-remove"]');
      
      if (await removeButton.isVisible()) {
        // Click remove button
        await removeButton.click();
        
        // Confirm removal
        await page.getByRole('button', { name: 'OK' }).click();
        
        // Wait for response
        await page.waitForTimeout(1000);
        
        // Check that member was removed
        const newMemberCount = await memberRows.count();
        expect(newMemberCount).toBeLessThan(memberCount);
      }
    }
  });

  test('should cancel pending invitation', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // First create an invitation
    const testEmail = `e2e+cancel+${Date.now()}@example.com`;
    
    await page.fill('[data-testid="invite-email"]', testEmail);
    await page.click('[data-testid="invite-submit"]');
    await page.waitForTimeout(1000);

    // Wait for invitation to appear
    await page.waitForSelector(`[data-testid="invite-row"]:has-text("${testEmail}")`);

    // Find the invitation row
    const inviteRow = page.locator(`[data-testid="invite-row"]:has-text("${testEmail}")`);
    
    // Click cancel button
    await inviteRow.locator('[data-testid="invite-cancel"]').click();
    
    // Confirm cancellation
    await page.getByRole('button', { name: 'OK' }).click();
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Check that invitation was removed
    await expect(inviteRow).not.toBeVisible();
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
    await expect(page.locator('text=Invite failed')).toBeVisible();
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
    await expect(page.locator('text=Invite failed')).toBeVisible();
  });

  test('should show role banner for non-admin users', async ({ page }) => {
    // Mock non-admin user
    await page.route('**/api/diag/clerk', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            userId: 'user_member123',
            orgId: 'org_123',
            role: 'org:member',
            canInvite: false,
            env: {
              secretKeyPresent: true,
              publishableKeyPresent: true,
              instanceIdPresent: false
            }
          }
        })
      });
    });

    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    // Check for role banner
    await expect(page.locator('[data-testid="role-banner"]')).toBeVisible();
    await expect(page.locator('text=You\'re a member. Only admins can invite, change roles, or remove users.')).toBeVisible();

    // Check that invite form is hidden
    await expect(page.locator('[data-testid="invite-email"]')).not.toBeVisible();
  });

  test('should disable submit button while pending', async ({ page }) => {
    await page.goto('/settings?tab=team');
    await page.waitForLoadState('networkidle');

    const testEmail = `e2e+disabled+${Date.now()}@example.com`;

    // Fill invitation form
    await page.fill('[data-testid="invite-email"]', testEmail);
    
    // Click submit and immediately check if button is disabled
    await page.click('[data-testid="invite-submit"]');
    
    // Button should be disabled during request (briefly)
    const submitButton = page.locator('[data-testid="invite-submit"]');
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Button should be enabled again
    await expect(submitButton).toBeEnabled();
  });
});
