/**
 * Weekly Pillar Generation Scheduler
 * Runs pillar generation for all tenants on a schedule
 * 
 * Usage:
 *   node scripts/weekly-pillar-generation.js
 * 
 * Environment:
 *   RUN_WEEKLY=true (enable scheduler)
 *   PILLAR_GENERATION_SCHEDULE="0 9 * * 1" (cron: every Monday at 9 AM, default)
 */

import cron from 'node-cron';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import all models
import '../src/models/Tenant.js';
import '../src/models/Page.js';
import '../src/models/KeywordCluster.js';
import '../src/models/Theme.js';
import '../src/models/Navigation.js';
import '../src/models/AdminUser.js';

// Import services
import { GenerationService } from '../src/services/GenerationService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';
const RUN_WEEKLY = process.env.RUN_WEEKLY === 'true';
const SCHEDULE = process.env.PILLAR_GENERATION_SCHEDULE || '0 9 * * 1'; // Every Monday at 9 AM

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function runWeeklyGeneration() {
  console.log('\n' + '='.repeat(60));
  console.log(`🕐 Weekly Pillar Generation - ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const connected = await connectDatabase();
  if (!connected) {
    console.error('❌ Cannot run generation: database connection failed');
    return;
  }

  try {
    const results = await GenerationService.runForAllTenants();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 WEEKLY GENERATION SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`Total Tenants: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    if (successful.length > 0) {
      console.log('\n✅ Successful Runs:');
      successful.forEach(result => {
        console.log(`  - ${result.tenantName}: ${result.pagesCreated?.length || 0} pages created`);
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Runs:');
      failed.forEach(result => {
        console.log(`  - ${result.tenantName}: ${result.error}`);
      });
    }

    console.log('\n✅ Weekly generation complete!\n');
  } catch (error) {
    console.error('❌ Weekly generation error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  } finally {
    await mongoose.disconnect();
  }
}

// Main execution
if (RUN_WEEKLY) {
  console.log('🚀 Pillar Generation Scheduler Started');
  console.log(`📅 Schedule: ${SCHEDULE} (${cron.validate(SCHEDULE) ? 'valid' : 'INVALID'})`);
  console.log('⏰ Waiting for scheduled time...\n');

  // Validate schedule
  if (!cron.validate(SCHEDULE)) {
    console.error(`❌ Invalid cron schedule: ${SCHEDULE}`);
    process.exit(1);
  }

  // Schedule the job
  cron.schedule(SCHEDULE, async () => {
    await runWeeklyGeneration();
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });

  // Also run immediately if RUN_IMMEDIATE=true (for testing)
  if (process.env.RUN_IMMEDIATE === 'true') {
    console.log('🏃 Running immediately (RUN_IMMEDIATE=true)...\n');
    runWeeklyGeneration();
  }

  // Keep process alive
  console.log('💤 Scheduler running. Press Ctrl+C to stop.\n');
} else {
  console.log('⚠️  Scheduler disabled (RUN_WEEKLY not set to "true")');
  console.log('   Set RUN_WEEKLY=true in .env to enable');
  console.log('\n   To run manually: node scripts/run-pillar.js <domain>');
  process.exit(0);
}

