#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use the hardcoded test credentials from the test files
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhduzkuvytwkjtwisozy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZHV6a3V2eXR3a2p0d2lzb3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMTUzMiwiZXhwIjoyMDcyNjA3NTMyfQ.g1kCWJ6WWqcBTZMnnLMC-5R4NimoSxwimclVTQYonI8';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function createVendorForUserUrl() {
  const targetVendorId = '503ede26-a860-445a-a82a-9dc6866a3875';
  const orgId = '834d4f30-1fee-48d8-800d-3faab6dee30d';

  try {
    console.log(`Creating vendor ${targetVendorId} for org ${orgId}...`);
    
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .upsert({
        id: targetVendorId,
        org_id: orgId,
        name: 'Test Vendor for Browser',
        website: 'https://testvendor-browser.com',
        official_site_confidence: 95
      }, { onConflict: 'id' })
      .select('id, name')
      .single();

    if (vendorError) throw vendorError;
    console.log('✓ Created vendor:', vendor.name, '(ID:', vendor.id, ')');

    console.log('\n🎉 Setup complete! Now test in browser:');
    console.log('1. Open browser and go to: http://localhost:3000/facts?comp=503ede26-a860-445a-a82a-9dc6866a3875');
    console.log('2. Open browser dev tools and run:');
    console.log('   document.cookie="TEST_CLERK_USER=test-user-123";');
    console.log('   document.cookie="TEST_CLERK_ORG=test-org-456";');
    console.log('3. Refresh the page');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createVendorForUserUrl();
