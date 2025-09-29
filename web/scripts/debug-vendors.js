#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use the hardcoded test credentials from the test files
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhduzkuvytwkjtwisozy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZHV6a3V2eXR3a2p0d2lzb3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMTUzMiwiZXhwIjoyMDcyNjA3NTMyfQ.g1kCWJ6WWqcBTZMnnLMC-5R4NimoSxwimclVTQYonI8';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function debugVendors() {
  const clerkOrgId = 'test-org-456';

  try {
    console.log('Debug: Checking database state...');

    // Check org
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('id, clerk_org_id, name')
      .eq('clerk_org_id', clerkOrgId);

    if (orgsError) throw orgsError;
    console.log('Orgs:', orgs);

    if (orgs.length > 0) {
      const orgId = orgs[0].id;
      
      // Check vendors for this org
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, org_id, name, website')
        .eq('org_id', orgId);

      if (vendorsError) throw vendorsError;
      console.log('Vendors for org', orgId, ':', vendors);

      // Delete all vendors for this org and try again
      if (vendors.length > 0) {
        console.log('Deleting all vendors for this org...');
        const { error: deleteError } = await supabase
          .from('vendors')
          .delete()
          .eq('org_id', orgId);
        
        if (deleteError) {
          console.error('Delete error:', deleteError);
        } else {
          console.log('✓ Deleted all vendors');
          
          // Try to create the self vendor again
          console.log('Creating self vendor...');
          const { data: selfVendor, error: selfVendorError } = await supabase
            .from('vendors')
            .insert({
              org_id: orgId,
              name: 'Slack',
              website: 'https://slack.com'
            })
            .select('id, name')
            .single();

          if (selfVendorError) {
            console.error('Self vendor creation error:', selfVendorError);
          } else {
            console.log('✓ Created self vendor:', selfVendor);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugVendors();
