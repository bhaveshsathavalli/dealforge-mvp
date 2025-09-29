#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhduzkuvytwkjtwisozy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZHV6a3V2eXR3a2p0d2lzb3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMTUzMiwiZXhwIjoyMDcyNjA3NTMyfQ.g1kCWJ6WWqcBTZMnnLMC-5R4NimoSxwimclVTQYonI8';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function createCompetitorVendor() {
  const orgId = '834d4f30-1fee-48d8-800d-3faab6dee30d';

  try {
    console.log('Creating competitor vendor...');
    
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        id: '9e8b4fef-ab73-4c87-90b8-be9fc3640886',
        org_id: orgId,
        name: 'Test Competitor',
        website: 'https://testcompetitor.com',
        official_site_confidence: 95
      })
      .select('id, name')
      .single();

    if (vendorError) throw vendorError;
    console.log('✓ Created competitor vendor:', vendor.name, '(ID:', vendor.id, ')');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createCompetitorVendor();
