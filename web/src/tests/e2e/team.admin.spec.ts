import { test, expect } from '@playwright/test';
import { seedOrg, sbAdmin } from '../../utils/supabaseTest';

test.describe('Team tab admin flow', () => {
  let clerkOrgId: string;
  let adminUserId: string;
  let adminEmail: string;

  test.beforeAll(async () => {
    const seed = await seedOrg();
    clerkOrgId = seed.clerkOrgId;
    adminUserId = seed.adminUserId;
    adminEmail = seed.adminEmail;
  });

  test('admin can invite, change role, and remove', async ({ page, request }) => {
    // 1) Mock session as admin
    const r1 = await request.post('/api/test/session', { 
      data: { clerkUserId: adminUserId, clerkOrgId } 
    });
    expect(r1.ok()).toBeTruthy();

    // 2) Go to Team tab
    await page.goto('/settings?tab=team');
    await expect(page.getByTestId('team-panel')).toBeVisible();
    await expect(page.getByTestId('btn-invite')).toBeVisible();

    // 3) Invite a new member
    const inviteeEmail = `e2e+${Date.now()}@example.com`;
    await page.getByTestId('invite-email').fill(inviteeEmail);
    await page.getByTestId('btn-invite').click();

    // Wait for row appears
    await expect(page.getByTestId('member-row').filter({ hasText: inviteeEmail })).toBeVisible();

    // 4) Change role of the new member to admin
    const newMemberRow = page.getByTestId('member-row').filter({ hasText: inviteeEmail });
    await newMemberRow.getByTestId('role-menu').selectOption('admin');

    // Expect label change to admin
    await expect(newMemberRow).toContainText('admin');

    // 5) Change back to member
    await newMemberRow.getByTestId('role-menu').selectOption('member');
    await expect(newMemberRow).toContainText('member');

    // 6) Remove the member
    await newMemberRow.getByTestId('btn-remove').click();
    // confirm modal likely appears; if so handle it
    const confirm = page.getByRole('button', { name: /confirm|delete/i });
    if (await confirm.isVisible()) await confirm.click();

    await expect(newMemberRow).toHaveCount(0);
  });

  test('member sees banner and no admin controls', async ({ page, request }) => {
    // 1) Mock session as member
    const r1 = await request.post('/api/test/session', { 
      data: { clerkUserId: 'member_user_123', clerkOrgId } 
    });
    expect(r1.ok()).toBeTruthy();

    // 2) Go to Team tab
    await page.goto('/settings?tab=team');
    await expect(page.getByTestId('team-panel')).toBeVisible();
    
    // 3) Should see banner and no admin controls
    await expect(page.getByTestId('role-banner')).toBeVisible();
    await expect(page.getByTestId('btn-invite')).toHaveCount(0);
    await expect(page.getByTestId('role-menu')).toHaveCount(0);
    await expect(page.getByTestId('btn-remove')).toHaveCount(0);
  });

  test.afterAll(async () => {
    // Clean up test data
    await sbAdmin.from('org_memberships').delete().eq('clerk_org_id', clerkOrgId);
  });
});