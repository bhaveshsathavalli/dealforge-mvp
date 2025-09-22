#!/usr/bin/env node

// Test script for the run inspector
// Usage: node test-run-inspector.js <run-id>

const RUN_ID = process.argv[2];

if (!RUN_ID) {
  console.log('Usage: node test-run-inspector.js <run-id>');
  console.log('Get a run ID from: http://localhost:3000/api/debug/runs');
  process.exit(1);
}

async function testRunInspector() {
  try {
    const response = await fetch(`http://localhost:3000/api/debug/run/${RUN_ID}/summary`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error:', response.status, error);
      return;
    }
    
    const data = await response.json();
    
    console.log('=== RUN INSPECTOR RESULTS ===');
    console.log('Run ID:', RUN_ID);
    console.log('');
    
    console.log('=== RUN CONTEXT ===');
    console.log('Query:', data.run?.query_text);
    console.log('Status:', data.run?.status);
    console.log('Created:', data.run?.created_at);
    console.log('Run Context:', JSON.stringify(data.run?.run_context, null, 2));
    console.log('');
    
    console.log('=== COUNTS ===');
    console.log('Total Claims:', data.counts?.totalClaims);
    console.log('Vendor You Citations:', data.counts?.vendorYou);
    console.log('Vendor Competitor Citations:', data.counts?.vendorComp);
    console.log('');
    
    console.log('=== CLAIMS BREAKDOWN ===');
    data.rows?.forEach((row, i) => {
      console.log(`${i + 1}. ${row.metric || 'No Metric'} (${row.side || 'No Side'})`);
      console.log(`   Text: ${row.text?.substring(0, 100)}...`);
      console.log(`   Citation Hosts: ${row.citationHosts?.join(', ') || 'None'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testRunInspector();
