#!/usr/bin/env tsx
// web/scripts/facts-smoke.ts
// Quick dev helper to refresh both sides and dump counts in the console

interface RefreshResponse {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

interface FactsResponse {
  ok: boolean;
  error?: string;
  you: {
    id: string;
    name: string;
    website: string;
    facts: {
      pricing: any[];
      features: any[];
      integrations: any[];
      trust: any[];
      changelog: any[];
    };
  };
  comp: {
    id: string;
    name: string;
    website: string;
    facts: {
      pricing: any[];
      features: any[];
      integrations: any[];
      trust: any[];
      changelog: any[];
    };
  };
  traceId: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // In local development, we'll assume the dev server is running on port 3000
  // and that Clerk auth is handled via cookies in the browser context
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const fullUrl = `${baseUrl}${url}`;

  console.log(`🌐 Fetching: ${fullUrl}`);
  
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'facts-smoke-script/1.0',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`❌ HTTP ${response.status} error:`, data);
    throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
  }

  return data;
}

async function refreshVendor(vendorId: string, lanes: string[]): Promise<RefreshResponse> {
  console.log(`🔄 Refreshing vendor ${vendorId} (lanes: ${lanes.join(', ')})`);
  
  const payload = { lanes };

  return await fetchWithAuth(`/api/vendors/${vendorId}/refresh`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function getFacts(vendorId: string): Promise<FactsResponse> {
  console.log(`📊 Fetching facts for vendor ${vendorId}`);
  return await fetchWithAuth(`/api/vendors/${vendorId}/facts`);
}

function logFactsCounts(factsData: FactsResponse) {
  console.log('\n📈 FACTS SUMMARY');
  console.log('================');
  
  const lanes = ['pricing', 'features', 'integrations', 'trust', 'changelog'] as const;
  
  console.log('\n🏢 YOU:', factsData.you.name);
  console.log('└── Website:', factsData.you.website);
  lanes.forEach(lane => {
    const count = factsData.you.facts[lane]?.length || 0;
    console.log(`└── ${lane.toUpperCase().padEnd(12)}: ${count} facts`);
  });
  
  console.log('\n🏢 THEM:', factsData.comp.name);
  console.log('└── Website:', factsData.comp.website);
  lanes.forEach(lane => {
    const count = factsData.comp.facts[lane]?.length || 0;
    console.log(`└── ${lane.toUpperCase().padEnd(12)}: ${count} facts`);
  });

  // Calculate totals for each lane
  console.log('\n📊 TOTALS BY LANE');
  lanes.forEach(lane => {
    const youCount = factsData.you.facts[lane]?.length || 0;
    const themCount = factsData.comp.facts[lane]?.length || 0;
    const total = youCount + themCount;
    console.log(`${lane.toUpperCase().padEnd(12)}: ${total} total (${youCount} + ${themCount})`);
  });

  // Check if all lanes are empty for both
  const youTotal = lanes.reduce((sum, lane) => sum + (factsData.you.facts[lane]?.length || 0), 0);
  const themTotal = lanes.reduce((sum, lane) => sum + (factsData.comp.facts[lane]?.length || 0), 0);
  const allEmpty = youTotal === 0 && themTotal === 0;
  
  console.log(`\n🎯 SUMMARY`);
  console.log(`You total: ${youTotal}, Them total: ${themTotal}`);
  
  if (allEmpty) {
    console.log('❌ ALERT: All lanes empty for both vendors!');
    return false;
  } else {
    console.log('✅ Facts data available');
    return true;
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Usage: tsx scripts/facts-smoke.ts <COMP_VENDOR_ID>');
    console.error('   Example: tsx scripts/facts-smoke.ts 12345678-1234-1234-1234-123456789012');
    process.exit(1);
  }

  const compId = args[0];
  
  // Validate UUID format (allowing uppercase letters)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(compId)) {
    console.error(`❌ Invalid UUID format: ${compId}`);
    process.exit(1);
  }

  console.log(`🚀 Facts Smoke Test`);
  console.log(`==================`);
  console.log(`🔗 Competitor ID: ${compId}`);
  console.log(`🌍 Base URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
  console.log('');

  try {
    // Step 1: Get facts first to identify both vendor IDs
    console.log('📊 STEP 1: Fetching vendor information...');
    const factsData = await getFacts(compId);
    
    console.log(`ℹ️  Identified vendors:`);
    console.log(`   You: ${factsData.you.name} (${factsData.you.id})`);
    console.log(`   Them: ${factsData.comp.name} (${factsData.comp.id})`);
    
    // Step 2: Refresh both sides
    console.log('\n🔄 STEP 2: Refreshing both vendors...');
    const lanes = ['pricing', 'features', 'integrations', 'trust', 'changelog'];
    
    console.log(`🔄 Refreshing "You" (${factsData.you.name})...`);
    const youRefreshResult = await refreshVendor(factsData.id, lanes);
    console.log('✅ You refresh completed');
    
    console.log(`🔄 Refreshing "Them" (${factsData.comp.name})...`);
    const themRefreshResult = await refreshVendor(factsData.comp.id, lanes);
    console.log('✅ Them refresh completed');
    
    // Wait a moment for refresh to complete
    console.log('⏱️  Waiting 3 seconds for refresh to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Fetch facts and display counts
    console.log('\n📊 STEP 3: Fetching updated facts...');
    const updatedFactsData = await getFacts(compId);
    
    const hasData = logFactsCounts(updatedFactsData);
    
    if (!hasData) {
      console.log('\n💡 TIP: Check that the vendor ID exists and has been crawled recently');
      process.exit(1);
    } else {
      console.log('\n✅ Smoke test completed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Smoke test failed:', error instanceof Error ? error.message : error);
    
    // Provide helpful debugging info
    console.error('\n🔍 Debugging tips:');
    console.error('  1. Ensure the dev server is running: npm run dev');
    console.error('  2. Verify the vendor ID exists in your organization');
    console.error('  3. Check that you are authenticated in the browser');
    console.error('  4. Inspect network requests in the browser dev tools');
    
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
}
