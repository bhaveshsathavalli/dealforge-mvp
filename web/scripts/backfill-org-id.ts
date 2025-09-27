#!/usr/bin/env tsx

/**
 * Backfill script to ensure all business rows have valid org_id values.
 * 
 * This script:
 * 1. Gets the active internal orgId using getActiveOrg
 * 2. Updates tables where org_id IS NULL to set org_id = orgId
 * 3. Runs in dry-run mode by default (logs counts)
 * 4. Use --apply flag to execute actual updates
 * 
 * Tables updated:
 * - vendors: set org_id where NULL
 * - compare_runs: set org_id where NULL  
 * - query_runs: set org_id where NULL
 * 
 * Note: sources, facts, battlecard_bullets, update_events don't have direct org_id
 * but are scoped through their parent relationships (vendor_id, run_id)
 */

// Check environment variables first
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  console.error('');
  console.error('💡 To run this script:');
  console.error('   1. Set up your .env.local file with Supabase credentials');
  console.error('   2. Or run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-org-id.ts');
  console.error('');
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { 
      persistSession: false, 
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

interface BackfillResult {
  table: string;
  rowsFound: number;
  rowsUpdated: number;
  error?: string;
}

async function backfillOrgId(apply: boolean = false): Promise<BackfillResult[]> {
  console.log(`🚀 Starting org_id backfill (${apply ? 'APPLY' : 'DRY-RUN'} mode)`);
  console.log('='.repeat(60));

  try {
    // Get the first available org ID (for backfill purposes)
    const { data: orgs, error: orgError } = await supabase
      .from('orgs')
      .select('id, name')
      .limit(1);

    if (orgError) {
      throw new Error(`Failed to get org: ${orgError.message}`);
    }

    if (!orgs || orgs.length === 0) {
      throw new Error('No organizations found in database');
    }

    const orgId = orgs[0].id;
    console.log(`📋 Using org ID: ${orgId} (${orgs[0].name})`);
    console.log('');

    const results: BackfillResult[] = [];

    // Tables that have direct org_id column
    const tablesWithOrgId = [
      'vendors',
      'compare_runs', 
      'query_runs'
    ];

    for (const tableName of tablesWithOrgId) {
      console.log(`🔍 Processing table: ${tableName}`);
      
      try {
        // Count rows where org_id IS NULL
        const { count: nullCount, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .is('org_id', null);

        if (countError) {
          console.log(`  ❌ Error counting null org_id rows: ${countError.message}`);
          results.push({
            table: tableName,
            rowsFound: 0,
            rowsUpdated: 0,
            error: countError.message
          });
          continue;
        }

        const rowsFound = nullCount || 0;
        console.log(`  📊 Found ${rowsFound} rows with NULL org_id`);

        if (rowsFound === 0) {
          console.log(`  ✅ No rows need updating`);
          results.push({
            table: tableName,
            rowsFound: 0,
            rowsUpdated: 0
          });
          continue;
        }

        if (!apply) {
          console.log(`  🔍 DRY-RUN: Would update ${rowsFound} rows`);
          results.push({
            table: tableName,
            rowsFound,
            rowsUpdated: 0
          });
        } else {
          // Actually update the rows
          const { count: updatedCount, error: updateError } = await supabase
            .from(tableName)
            .update({ org_id: orgId })
            .is('org_id', null)
            .select('*', { count: 'exact', head: true });

          if (updateError) {
            console.log(`  ❌ Error updating rows: ${updateError.message}`);
            results.push({
              table: tableName,
              rowsFound,
              rowsUpdated: 0,
              error: updateError.message
            });
          } else {
            const rowsUpdated = updatedCount || 0;
            console.log(`  ✅ Updated ${rowsUpdated} rows`);
            results.push({
              table: tableName,
              rowsFound,
              rowsUpdated
            });
          }
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ❌ Unexpected error: ${errorMessage}`);
        results.push({
          table: tableName,
          rowsFound: 0,
          rowsUpdated: 0,
          error: errorMessage
        });
      }

      console.log('');
    }

    // Check tables that don't have direct org_id but are linked through relationships
    console.log('🔗 Checking linked tables (no direct org_id column)');
    console.log('');

    const linkedTables = [
      { name: 'sources', via: 'vendor_id -> vendors.org_id' },
      { name: 'facts', via: 'vendor_id -> vendors.org_id' },
      { name: 'battlecard_bullets', via: 'run_id -> compare_runs.org_id' },
      { name: 'update_events', via: 'vendor_id -> vendors.org_id' }
    ];

    for (const { name: tableName, via } of linkedTables) {
      console.log(`🔍 Checking table: ${tableName} (linked via ${via})`);
      
      try {
        // Count total rows
        const { count: totalCount, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.log(`  ❌ Error counting rows: ${countError.message}`);
          results.push({
            table: tableName,
            rowsFound: 0,
            rowsUpdated: 0,
            error: countError.message
          });
          continue;
        }

        const totalRows = totalCount || 0;
        console.log(`  📊 Total rows: ${totalRows}`);
        
        if (totalRows === 0) {
          console.log(`  ✅ No rows to check`);
          results.push({
            table: tableName,
            rowsFound: 0,
            rowsUpdated: 0
          });
        } else {
          console.log(`  ℹ️  Rows are scoped through parent relationships`);
          results.push({
            table: tableName,
            rowsFound: totalRows,
            rowsUpdated: 0
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ❌ Unexpected error: ${errorMessage}`);
        results.push({
          table: tableName,
          rowsFound: 0,
          rowsUpdated: 0,
          error: errorMessage
        });
      }

      console.log('');
    }

    return results;

  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  if (apply) {
    console.log('⚠️  APPLY MODE: This will make actual database changes!');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Proceeding with updates...\n');
  }

  try {
    const results = await backfillOrgId(apply);
    
    console.log('📋 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    
    let totalFound = 0;
    let totalUpdated = 0;
    let errors = 0;

    for (const result of results) {
      const status = result.error ? '❌' : (result.rowsUpdated > 0 ? '✅' : 'ℹ️');
      console.log(`${status} ${result.table.padEnd(20)} | Found: ${result.rowsFound.toString().padStart(4)} | Updated: ${result.rowsUpdated.toString().padStart(4)}`);
      
      if (result.error) {
        console.log(`    Error: ${result.error}`);
        errors++;
      }
      
      totalFound += result.rowsFound;
      totalUpdated += result.rowsUpdated;
    }

    console.log('='.repeat(60));
    console.log(`📊 TOTALS: Found ${totalFound} rows, Updated ${totalUpdated} rows`);
    
    if (errors > 0) {
      console.log(`❌ ${errors} tables had errors`);
      process.exit(1);
    } else if (totalUpdated > 0) {
      console.log(`✅ Successfully updated ${totalUpdated} rows`);
    } else {
      console.log(`✅ No rows needed updating`);
    }

  } catch (error) {
    console.error('💥 Backfill failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
