import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhduzkuvytwkjtwisozy.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZHV6a3V2eXR3a2p0d2lzb3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMTUzMiwiZXhwIjoyMDcyNjA3NTMyfQ.g1kCWJ6WWqcBTZMnnLMC-5R4NimoSxwimclVTQYonI8';

const sbAdmin = createClient(url, serviceKey, { 
  auth: { persistSession: false } 
});

async function seedOrg() {
  const clerkOrgId = 'org_test123';
  const adminUserId = 'user_admin123';
  const adminEmail = 'admin+test@example.com';

  const { data: orgRow, error: orgErr } = await sbAdmin
    .from('orgs')
    .upsert({ 
      name: `Test Org ${clerkOrgId}`, 
      clerk_org_id: clerkOrgId, 
      plan_type: 'starter' 
    }, { onConflict: 'clerk_org_id' })
    .select('id, clerk_org_id')
    .single();

  if (orgErr) throw orgErr;
  const orgId = orgRow.id;

  const { error: profileErr } = await sbAdmin.from('profiles').upsert({
    clerk_user_id: adminUserId, 
    email: adminEmail, 
    name: 'Admin Test' 
  }, { onConflict: 'clerk_user_id' });
  
  if (profileErr) throw profileErr;

  const { error: membershipErr } = await sbAdmin.from('org_memberships').upsert({
    clerk_org_id: clerkOrgId, 
    clerk_user_id: adminUserId, 
    role: 'admin' 
  }, { onConflict: 'clerk_user_id,clerk_org_id' });
  
  if (membershipErr) throw membershipErr;

  return { 
    orgId, 
    clerkOrgId, 
    adminUserId, 
    adminEmail
  };
}

async function removeMember(clerkOrgId: string, clerkUserId: string) {
  await sbAdmin
    .from('org_memberships')
    .delete()
    .eq('clerk_org_id', clerkOrgId)
    .eq('clerk_user_id', clerkUserId);
}

test.describe('Team invite flow', () => {
  let clerkOrgId: string;
  let adminUserId: string;
  let adminEmail: string;

  test.beforeAll(async () => {
    const seed = await seedOrg();
    clerkOrgId = seed.clerkOrgId;
    adminUserId = seed.adminUserId;
    adminEmail = seed.adminEmail;
  });

  test('admin can invite, accept, and manage members', async ({ page, request }) => {
    // 1) Mock session as admin by setting cookies directly in the browser context
    await page.context().addCookies([
      {
        name: 'TEST_CLERK_USER',
        value: adminUserId,
        domain: 'localhost',
        path: '/',
        httpOnly: true
      },
      {
        name: 'TEST_CLERK_ORG', 
        value: clerkOrgId,
        domain: 'localhost',
        path: '/',
        httpOnly: true
      }
    ]);

    // 2) Go to Team tab
    await page.goto('/settings?tab=team');
    
    // Wait for the team panel to appear
    await expect(page.getByTestId('team-panel')).toBeVisible({ timeout: 15000 });
    
    // 3) Verify admin controls are visible
    await expect(page.getByTestId('invite-email')).toBeVisible();
    await expect(page.getByTestId('invite-submit')).toBeVisible();
    
    // 4) Verify no member banner for admin
    await expect(page.getByTestId('role-banner')).toHaveCount(0);

    // 5) Invite a new member
    const inviteeEmail = `e2e+${Date.now()}@example.com`;
    await page.getByTestId('invite-email').fill(inviteeEmail);
    await page.getByTestId('invite-submit').click();

    // 6) Wait for invitation to appear in pending list
    await expect(page.getByTestId('invite-row').filter({ hasText: inviteeEmail })).toBeVisible();

    // 7) Accept the invitation programmatically (simulate webhook)
    const acceptResponse = await request.post('/api/test/accept-invite', {
      data: { email: inviteeEmail }
    });
    expect(acceptResponse.ok()).toBeTruthy();

    // 8) Refresh page to see new member
    await page.reload();
    
    // 9) Verify new member appears in members list
    const newMemberRow = page.getByTestId('member-row').filter({ hasText: inviteeEmail });
    await expect(newMemberRow).toBeVisible();
    
    // 10) Verify invitation is no longer pending
    await expect(page.getByTestId('invite-row').filter({ hasText: inviteeEmail })).toHaveCount(0);

    // 11) Change role of the new member to admin
    const roleMenu = newMemberRow.getByTestId('role-menu');
    await roleMenu.selectOption('admin');
    
    // Wait for role to update
    await expect(newMemberRow).toContainText('admin');

    // 12) Change role back to member
    await roleMenu.selectOption('member');
    await expect(newMemberRow).toContainText('member');

    // 13) Remove the member
    await newMemberRow.getByTestId('btn-remove').click();
    
    // Handle confirmation dialog if it appears
    page.on('dialog', dialog => dialog.accept());
    
    // 14) Verify member is removed
    await expect(newMemberRow).toHaveCount(0);
  });

  test('member sees banner and no admin controls', async ({ page, request }) => {
    // Create a member user
    const memberUserId = `user_member_${Date.now()}`;
    const memberEmail = `member+${Date.now()}@example.com`;
    
    // Add member to org
    await sbAdmin.from('profiles').upsert({
      clerk_user_id: memberUserId,
      email: memberEmail,
      name: 'Test Member'
    });
    
    await sbAdmin.from('org_memberships').upsert({
      clerk_org_id: clerkOrgId,
      clerk_user_id: memberUserId,
      role: 'member'
    });

    // Mock session as member by setting cookies directly
    await page.context().addCookies([
      {
        name: 'TEST_CLERK_USER',
        value: memberUserId,
        domain: 'localhost',
        path: '/',
        httpOnly: true
      },
      {
        name: 'TEST_CLERK_ORG', 
        value: clerkOrgId,
        domain: 'localhost',
        path: '/',
        httpOnly: true
      }
    ]);

    // Go to Team tab
    await page.goto('/settings?tab=team');
    
    // Verify member banner is visible
    await expect(page.getByTestId('role-banner')).toBeVisible();
    
    // Verify admin controls are hidden
    await expect(page.getByTestId('invite-email')).toHaveCount(0);
    await expect(page.getByTestId('invite-submit')).toHaveCount(0);
    
    // Verify member can see the list but no role controls
    await expect(page.getByTestId('member-row')).toHaveCount(1);
    await expect(page.getByTestId('role-menu')).toHaveCount(0);
    await expect(page.getByTestId('btn-remove')).toHaveCount(0);

    // Cleanup
    await removeMember(clerkOrgId, memberUserId);
  });

  test.afterAll(async () => {
    // Clean up test data
    await sbAdmin.from('org_memberships').delete().eq('clerk_org_id', clerkOrgId);
    await sbAdmin.from('org_invitations').delete().eq('clerk_org_id', clerkOrgId);
  });
});
