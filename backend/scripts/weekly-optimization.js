/**
 * Weekly Site Optimization Job
 * 
 * Optimizes pages based on Search Console metrics:
 * - Low CTR: Rewrite title/meta
 * - Position 8-15: Expand content
 * - Internal links: Always improve
 * 
 * Usage:
 *   node scripts/weekly-optimization.js [--once] [--auto-publish]
 * 
 * Environment Variables Required:
 *   MONGODB_URI
 *   OPENAI_API_KEY
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
import '../src/models/PageSearchMetricsWeekly.js';
import '../src/models/PageVersion.js';

// Import services
import { SiteOptimizationService } from '../src/services/SiteOptimizationService.js';
import { TenantService } from '../src/services/TenantService.js';
import SearchConsoleProperty from '../src/models/SearchConsoleProperty.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';
const AUTO_PUBLISH = process.env.AUTO_PUBLISH_OPTIMIZATIONS === 'true';

/**
 * Optimize all tenants with GSC connected
 */
async function optimizeAllTenants() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 WEEKLY OPTIMIZATION JOB STARTED');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔧 Auto-publish: ${AUTO_PUBLISH ? 'ENABLED' : 'DISABLED'}`);
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
      totalPagesOptimized: 0,
      totalTitlesRewritten: 0,
      totalContentExpanded: 0,
      totalInternalLinksAdded: 0,
      errors: []
    };

    // Optimize each tenant
    for (const property of properties) {
      const tenantId = property.tenantId._id || property.tenantId;
      const tenant = await TenantService.getTenantById(tenantId.toString());

      if (!tenant) {
        console.warn(`⚠️  Tenant ${tenantId} not found, skipping...`);
        continue;
      }

      console.log(`\n📊 Optimizing tenant: ${tenant.name} (${tenant.domain})`);

      try {
        const optimizationResult = await SiteOptimizationService.optimizeTenant(
          tenantId.toString(),
          AUTO_PUBLISH
        );

        results.tenantsSucceeded += 1;
        results.totalPagesOptimized += optimizationResult.pagesOptimized || 0;
        results.totalTitlesRewritten += optimizationResult.titlesRewritten || 0;
        results.totalContentExpanded += optimizationResult.contentExpanded || 0;
        results.totalInternalLinksAdded += optimizationResult.internalLinksAdded || 0;

        console.log(`✅ Optimized ${optimizationResult.pagesOptimized} pages`);
        console.log(`   - Titles rewritten: ${optimizationResult.titlesRewritten}`);
        console.log(`   - Content expanded: ${optimizationResult.contentExpanded}`);
        console.log(`   - Internal links added: ${optimizationResult.internalLinksAdded}`);

        if (optimizationResult.errors && optimizationResult.errors.length > 0) {
          results.errors.push(...optimizationResult.errors.map(e => ({
            tenant: tenant.domain,
            ...e
          })));
        }

        // Check for cannibalization
        const cannibalization = await SiteOptimizationService.detectCannibalization(tenantId.toString());
        if (cannibalization.length > 0) {
          console.log(`\n⚠️  Keyword Cannibalization Detected: ${cannibalization.length} queries`);
          cannibalization.slice(0, 3).forEach(c => {
            console.log(`   - "${c.query}": ${c.pages.length} pages competing`);
          });
        }

      } catch (error) {
        results.tenantsFailed += 1;
        console.error(`❌ Error optimizing tenant ${tenant.domain}:`, error.message);
        results.errors.push({
          tenant: tenant.domain,
          error: error.message
        });
      }

      results.tenantsProcessed += 1;
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log('✅ WEEKLY OPTIMIZATION JOB COMPLETE');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📊 Tenants Processed: ${results.tenantsProcessed}`);
    console.log(`✅ Tenants Succeeded: ${results.tenantsSucceeded}`);
    console.log(`❌ Tenants Failed: ${results.tenantsFailed}`);
    console.log(`📄 Total Pages Optimized: ${results.totalPagesOptimized}`);
    console.log(`✏️  Titles Rewritten: ${results.totalTitlesRewritten}`);
    console.log(`📝 Content Expanded: ${results.totalContentExpanded}`);
    console.log(`🔗 Internal Links Added: ${results.totalInternalLinksAdded}`);

    // CLI Summary
    console.log('\n📊 CLI SUMMARY:');
    console.log(`   Pages Optimized: ${results.totalPagesOptimized}`);
    console.log(`   Titles Rewritten: ${results.totalTitlesRewritten}`);
    console.log(`   Content Expanded: ${results.totalContentExpanded}`);
    console.log(`   Internal Links Added: ${results.totalInternalLinksAdded}`);
    const estimatedCost = (results.totalPagesOptimized * 0.001); // Rough estimate
    console.log(`   Estimated AI Cost: ~$${estimatedCost.toFixed(2)}`);
    console.log('');

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
    console.error('❌ Fatal error in optimization job:', error);
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
 * Runs every Tuesday at 3 AM UTC (after GSC sync on Monday)
 */
function startScheduler() {
  console.log('⏰ Optimization Scheduler Starting...');
  console.log('📅 Schedule: Every Tuesday at 3:00 AM UTC');
  console.log('🔧 Cron Expression: 0 3 * * 2');
  console.log('');

  // Schedule: Every Tuesday at 3 AM UTC
  cron.schedule('0 3 * * 2', async () => {
    await optimizeAllTenants();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Also run immediately on startup (optional)
  console.log('🚀 Running initial optimization...\n');
  optimizeAllTenants().catch(error => {
    console.error('❌ Error in initial optimization:', error);
  });

  console.log('✅ Scheduler started. Script will continue running...');
  console.log('💡 Press Ctrl+C to stop\n');
}

// Check if running as scheduled job or one-time
const args = process.argv.slice(2);
if (args.includes('--once')) {
  // Run once and exit
  optimizeAllTenants()
    .then(() => {
      console.log('✅ Optimization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Optimization failed:', error);
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

