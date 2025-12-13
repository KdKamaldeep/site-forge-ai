/**
 * Weekly Google Search Console Sync Job
 * 
 * Syncs Search Console data for all tenants with GSC connected.
 * Runs weekly (configurable via cron expression).
 * 
 * Usage:
 *   node scripts/weekly-gsc-sync.js
 * 
 * Environment Variables Required:
 *   MONGODB_URI
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cron = require('node-cron');

// Load environment variables FIRST
dotenv.config();

// Import models
import '../src/models/Tenant.js';
import '../src/models/Page.js';
import '../src/models/SearchConsoleProperty.js';
import '../src/models/PageSearchMetricsWeekly.js';

// Import services
import { SearchConsoleService } from '../src/services/SearchConsoleService.js';
import { TenantService } from '../src/services/TenantService.js';
import SearchConsoleProperty from '../src/models/SearchConsoleProperty.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

/**
 * Sync GSC data for all connected tenants
 */
async function syncAllTenants() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🔄 WEEKLY GSC SYNC JOB STARTED');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  let dbConnected = false;

  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ Connected to MongoDB\n');

    // Get all tenants with GSC connected
    const properties = await SearchConsoleProperty.find({ verified: true }).populate('tenantId');
    
    if (properties.length === 0) {
      console.log('⚠️  No tenants with GSC connected. Exiting.');
      return;
    }

    console.log(`✅ Found ${properties.length} tenant(s) with GSC connected\n`);

    const results = {
      tenantsProcessed: 0,
      tenantsSucceeded: 0,
      tenantsFailed: 0,
      totalPagesProcessed: 0,
      totalMetricsCreated: 0,
      errors: []
    };

    // Sync each tenant (isolate errors per tenant)
    for (const property of properties) {
      const tenantId = property.tenantId._id || property.tenantId;
      const tenant = await TenantService.getTenantById(tenantId.toString());

      if (!tenant) {
        console.warn(`⚠️  Tenant ${tenantId} not found, skipping...`);
        continue;
      }

      console.log(`\n📊 Syncing tenant: ${tenant.name} (${tenant.domain})`);

      try {
        // Sync last 7 days
        const toDate = new Date();
        const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const syncResult = await SearchConsoleService.syncTenantData(
          tenantId.toString(),
          fromDate,
          toDate
        );

        results.tenantsSucceeded += 1;
        results.totalPagesProcessed += syncResult.pagesProcessed || 0;
        results.totalMetricsCreated += syncResult.metricsCreated || 0;

        console.log(`✅ Synced ${syncResult.pagesProcessed} pages, created ${syncResult.metricsCreated} metric records`);

        if (syncResult.errors && syncResult.errors.length > 0) {
          console.warn(`⚠️  ${syncResult.errors.length} errors during sync`);
          results.errors.push(...syncResult.errors.map(e => ({
            tenant: tenant.domain,
            ...e
          })));
        }
      } catch (error) {
        results.tenantsFailed += 1;
        console.error(`❌ Error syncing tenant ${tenant.domain}:`, error.message);
        results.errors.push({
          tenant: tenant.domain,
          error: error.message
        });
        // Continue with next tenant (don't crash the whole job)
      }

      results.tenantsProcessed += 1;
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log('✅ WEEKLY GSC SYNC JOB COMPLETE');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📊 Tenants Processed: ${results.tenantsProcessed}`);
    console.log(`✅ Tenants Succeeded: ${results.tenantsSucceeded}`);
    console.log(`❌ Tenants Failed: ${results.tenantsFailed}`);
    console.log(`📄 Total Pages Processed: ${results.totalPagesProcessed}`);
    console.log(`📈 Total Metrics Created: ${results.totalMetricsCreated}`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${results.errors.length}`);
      results.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.tenant || 'Unknown'}: ${error.error}`);
      });
      if (results.errors.length > 5) {
        console.log(`   ... and ${results.errors.length - 5} more`);
      }
    }

    console.log('');

  } catch (error) {
    console.error('❌ Fatal error in GSC sync job:', error);
    console.error(error.stack);
  } finally {
    if (dbConnected) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

/**
 * Start the scheduler
 * Runs every Monday at 2 AM UTC (configurable)
 */
function startScheduler() {
  console.log('⏰ GSC Sync Scheduler Starting...');
  console.log('📅 Schedule: Every Monday at 2:00 AM UTC');
  console.log('🔧 Cron Expression: 0 2 * * 1');
  console.log('');

  // Schedule: Every Monday at 2 AM UTC
  cron.schedule('0 2 * * 1', async () => {
    await syncAllTenants();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Also run immediately on startup (optional - comment out if you don't want this)
  console.log('🚀 Running initial sync...\n');
  syncAllTenants().catch(error => {
    console.error('❌ Error in initial sync:', error);
  });

  console.log('✅ Scheduler started. Script will continue running...');
  console.log('💡 Press Ctrl+C to stop\n');
}

// Check if running as scheduled job or one-time
const args = process.argv.slice(2);
if (args.includes('--once')) {
  // Run once and exit
  syncAllTenants()
    .then(() => {
      console.log('✅ Sync completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sync failed:', error);
      process.exit(1);
    });
} else {
  // Start scheduler
  startScheduler();

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
  });
}

