#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use the hardcoded test credentials from the test files
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhduzkuvytwkjtwisozy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZHV6a3V2eXR3a2p0d2lzb3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMTUzMiwiZXhwIjoyMDcyNjA3NTMyfQ.g1kCWJ6WWqcBTZMnnLMC-5R4NimoSxwimclVTQYonI8';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function setupTestAuth() {
  const clerkOrgId = 'test-org-456';
  const clerkUserId = 'test-user-123';
  const adminEmail = 'admin+test@example.com';

  try {
    console.log('Setting up test organization...');

    // 1. Create the org (minimal fields)
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .upsert({
        name: `Test Org`,
        clerk_org_id: clerkOrgId
      }, { onConflict: 'clerk_org_id' })
      .select('id')
      .single();

    if (orgError) throw orgError;
    console.log('✓ Created org:', org.id);

    // 2. Create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        clerk_user_id: clerkUserId,
        email: adminEmail,
        name: 'Test Admin'
      }, { onConflict: 'clerk_user_id' });

    if (profileError) throw profileError;
    console.log('✓ Created profile');

    // 3. Create the membership
    const { error: membershipError } = await supabase
      .from('org_memberships')
      .upsert({
        clerk_org_id: clerkOrgId,
        clerk_user_id: clerkUserId,
        role: 'admin'
      }, { onConflict: 'clerk_user_id,clerk_org_id' });

    if (membershipError) throw membershipError;
    console.log('✓ Created membership');

    // 4. Create self vendor (required by ensureSelfVendor)
    const { data: selfVendor, error: selfVendorError } = await supabase
      .from('vendors')
      .upsert({
        org_id: org.id,
        name: 'Slack', // Default self vendor name
        website: 'https://slack.com'
      }, { onConflict: 'org_id,name' })
      .select('id, name')
      .single();

    if (selfVendorError) throw selfVendorError;
    console.log('✓ Created self vendor:', selfVendor.name, '(ID:', selfVendor.id, ')');

    // 5. Create test competitor vendor
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .upsert({
        id: '9e8b4fef-ab73-4c87-90b8-be9fc3640886', // Use the same UUID from the URL
        org_id: org.id,
        name: 'Test Competitor',
        website: 'https://testcompetitor.com',
        official_site_confidence: 95
      }, { onConflict: 'id' })
      .select('id, name')
      .single();

    if (vendorError) throw vendorError;
    console.log('✓ Created competitor vendor:', vendor.name, '(ID:', vendor.id, ')');

    console.log('\n🎉 Test authentication setup complete!');
    console.log('You can now test the API with:');
    console.log('curl -b "TEST_CLERK_USER=test-user-123; TEST_CLERK_ORG=test-org-456" "http://localhost:3000/api/vendors/9e8b4fef-ab73-4c87-90b8-be9fc3640886/facts"');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestAuth();
