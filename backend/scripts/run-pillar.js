/**
 * CLI script to run pillar-based generation for ALL pillars
 * 
 * This script goes through each content pillar/category one by one
 * and creates the specified number of pages for each pillar.
 * 
 * Usage:
 *   node scripts/run-pillar.js <domain> [--count 3]
 * 
 * Example:
 *   node scripts/run-pillar.js example.com
 *   node scripts/run-pillar.js example.com --count 3
 * 
 * This will create 3 pages for each pillar/category in the tenant's contentPillars
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Import all models to ensure they're registered with Mongoose
import '../src/models/Tenant.js';
import '../src/models/Page.js';
import '../src/models/KeywordCluster.js';
import '../src/models/Theme.js';
import '../src/models/Navigation.js';
import '../src/models/AdminUser.js';

// Now import services
import { TenantService } from '../src/services/TenantService.js';
import { GenerationService } from '../src/services/GenerationService.js';
import { PillarService } from '../src/services/PillarService.js';
import { PageService } from '../src/services/PageService.js';
import { MicrositeBuilderAgent } from '../src/agents/micrositeBuilderAgent.js';
import { LogoService } from '../src/services/LogoService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

/**
 * Activate a specific pillar category by directly setting it as active
 */
async function activatePillarForCategory(tenantId, categoryKey) {
  const tenant = await TenantService.getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Check if the desired category exists
  const categoryConfig = tenant.contentPillars?.find(c => c.categoryKey === categoryKey);
  if (!categoryConfig) {
    throw new Error(`Category ${categoryKey} not found in tenant's contentPillars`);
  }

  // Check if the desired category is already active
  const currentActive = tenant.activePillar;
  if (currentActive && currentActive.categoryKey === categoryKey) {
    console.log(`   ✅ Category ${categoryKey} is already active`);
    return currentActive;
  }

  // If there's an active pillar for a different category, complete it first
  if (currentActive && currentActive.categoryKey !== categoryKey) {
    console.log(`   🔄 Completing current pillar "${currentActive.pillarKeyword || 'null'}" to switch to ${categoryKey}`);
    
    // Validate activePillar has required fields before moving to history
    const hasValidPillar = currentActive.categoryKey && 
                          currentActive.pillarKeyword && 
                          currentActive.createdAt;
    
    // Move current pillar to history only if valid
    if (hasValidPillar) {
      if (!tenant.pillarHistoryNew) {
        tenant.pillarHistoryNew = [];
      }
      tenant.pillarHistoryNew.push({
        categoryKey: currentActive.categoryKey,
        pillarKeyword: currentActive.pillarKeyword,
        targetSupportingCount: currentActive.targetSupportingCount || 30,
        createdAt: currentActive.createdAt,
        completedAt: new Date()
      });
      console.log(`   ✅ Moved pillar to history`);
    } else {
      console.warn(`   ⚠️  Active pillar is incomplete, skipping history entry`);
    }
  }

  // Generate a new pillar keyword for the desired category
  console.log(`   🎯 Generating pillar keyword for category: ${categoryKey}`);
  const candidates = await PillarService.generatePillarCandidates(tenant, [categoryConfig]);
  const selected = PillarService.selectBestPillar(candidates);

  if (selected.categoryKey !== categoryKey) {
    // Fallback: use a simple pillar name based on category
    const fallbackKeyword = `${categoryConfig.description} guide`;
    console.log(`   ⚠️  Using fallback pillar keyword: "${fallbackKeyword}"`);
    
    tenant.activePillar = {
      categoryKey: categoryKey,
      pillarKeyword: fallbackKeyword,
      targetSupportingCount: categoryConfig.postingRatePerWeek 
        ? Math.max(30, categoryConfig.postingRatePerWeek * 10) 
        : 30,
      createdAt: new Date(),
      completedAt: null
    };
  } else {
    const targetSupportingCount = categoryConfig.postingRatePerWeek 
      ? Math.max(30, categoryConfig.postingRatePerWeek * 10) 
      : 30;

    tenant.activePillar = {
      categoryKey: selected.categoryKey,
      pillarKeyword: selected.keyword,
      targetSupportingCount,
      createdAt: new Date(),
      completedAt: null
    };
  }

  await tenant.save();
  console.log(`   ✅ Activated pillar: "${tenant.activePillar.pillarKeyword}" for category: ${categoryKey}`);
  
  return tenant.activePillar;
}

/**
 * Get list of already processed categories from pillar history
 */
function getProcessedCategories(tenant) {
  const processed = new Set();
  
  // Check pillar history for completed categories
  if (tenant.pillarHistoryNew && Array.isArray(tenant.pillarHistoryNew)) {
    tenant.pillarHistoryNew.forEach(historyItem => {
      if (historyItem.categoryKey && historyItem.completedAt) {
        processed.add(historyItem.categoryKey);
      }
    });
  }
  
  return processed;
}

/**
 * Find the starting index for resumption
 * Returns the index of the first unprocessed category, or 0 if all are processed
 * Priority: Active pillar > First unprocessed > Start from beginning
 */
function findResumeIndex(contentPillars, processedCategories, currentActivePillar) {
  // PRIORITY 1: If there's an active pillar, ALWAYS resume from that category
  // This handles the case where processing stopped mid-category
  if (currentActivePillar && currentActivePillar.categoryKey) {
    const activeCategoryIndex = contentPillars.findIndex(
      p => p.categoryKey === currentActivePillar.categoryKey
    );
    
    if (activeCategoryIndex !== -1) {
      const isProcessed = processedCategories.has(currentActivePillar.categoryKey);
      if (isProcessed) {
        console.log(`\n   ℹ️  Active pillar category ${currentActivePillar.categoryKey} is already completed.`);
        console.log(`   🔄 Will continue to next unprocessed category...`);
      } else {
        console.log(`\n🔄 Resuming from active pillar category: ${currentActivePillar.categoryKey}`);
        console.log(`   (Processing was interrupted during this category)`);
        return activeCategoryIndex;
      }
    }
  }
  
  // PRIORITY 2: Find first unprocessed category
  for (let i = 0; i < contentPillars.length; i++) {
    if (!processedCategories.has(contentPillars[i].categoryKey)) {
      console.log(`\n🔄 Resuming from first unprocessed category: ${contentPillars[i].categoryKey}`);
      return i;
    }
  }
  
  // PRIORITY 3: All categories processed, start from beginning
  console.log(`\n   ℹ️  All categories have been processed. Starting fresh cycle...`);
  return 0;
}

/**
 * Simplified version: Just ensure we process each category
 * We'll generate pages and let the system handle rotation naturally
 * Now with resumption support - resumes from where it left off
 */
async function generateForAllPillars(tenantId, countPerPillar) {
  const tenant = await TenantService.getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const contentPillars = tenant.contentPillars || [];
  if (contentPillars.length === 0) {
    throw new Error('No content pillars found for this tenant');
  }

  console.log(`\n📋 Found ${contentPillars.length} content pillar(s):`);
  contentPillars.forEach((pillar, index) => {
    console.log(`   ${index + 1}. ${pillar.categoryKey} - ${pillar.description}`);
  });

  // Check which categories have already been processed
  const processedCategories = getProcessedCategories(tenant);
  const currentActivePillar = tenant.activePillar;
  
  console.log(`\n📊 Resumption Check:`);
  console.log(`   ✅ Already processed: ${Array.from(processedCategories).join(', ') || 'none'}`);
  console.log(`   📌 Current active pillar: ${currentActivePillar?.categoryKey || 'none'}`);
  if (currentActivePillar?.pillarKeyword) {
    console.log(`   📝 Active pillar keyword: "${currentActivePillar.pillarKeyword}"`);
  }
  
  // Find where to resume
  const startIndex = findResumeIndex(contentPillars, processedCategories, currentActivePillar);
  
  if (startIndex > 0 || (currentActivePillar && !processedCategories.has(currentActivePillar.categoryKey))) {
    const resumeCategory = contentPillars[startIndex]?.categoryKey || currentActivePillar?.categoryKey;
    console.log(`\n   ▶️  Resuming from category ${startIndex + 1}/${contentPillars.length}: ${resumeCategory}`);
    console.log(`   💡 This category was not completed in the previous run`);
  } else if (processedCategories.size === contentPillars.length) {
    console.log(`\n   ℹ️  All categories have been processed. Starting fresh cycle...`);
  }

  const allResults = [];
  const newlyProcessedCategories = new Set();

  // Process each pillar category starting from resume point
  for (let i = startIndex; i < contentPillars.length; i++) {
    const pillarConfig = contentPillars[i];
    const categoryKey = pillarConfig.categoryKey;

    // Skip if already processed (unless we're resuming from active pillar)
    if (processedCategories.has(categoryKey) && 
        (!currentActivePillar || currentActivePillar.categoryKey !== categoryKey)) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`⏭️  Skipping Pillar ${i + 1}/${contentPillars.length}: ${categoryKey} (already processed)`);
      console.log(`${'='.repeat(70)}\n`);
      continue;
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📌 Processing Pillar ${i + 1}/${contentPillars.length}: ${categoryKey}`);
    if (processedCategories.has(categoryKey)) {
      console.log(`   (Resuming from active pillar)`);
    }
    console.log(`${'='.repeat(70)}\n`);

    try {
      // Activate this pillar category
      const activePillar = await activatePillarForCategory(tenantId, categoryKey);
      
      if (activePillar.categoryKey !== categoryKey) {
        console.log(`   ⚠️  Could not activate ${categoryKey}, current active is ${activePillar.categoryKey}`);
        console.log(`   ⏭️  Skipping this category for now\n`);
        continue;
      }

      console.log(`   ✅ Active Pillar: "${activePillar.pillarKeyword}" (category: ${categoryKey})`);

      // Generate pages for this pillar
      const options = { count: countPerPillar };
      const result = await GenerationService.runPillarGenerationForTenant(tenantId, options);

      const pagesCreated = result.pagesCreated || [];
      
      // Mark this category as completed in history (if not already there)
      // This ensures resumption works correctly on next run
      const tenant = await TenantService.getTenantById(tenantId);
      if (tenant && tenant.activePillar && tenant.activePillar.categoryKey === categoryKey) {
        const isAlreadyInHistory = tenant.pillarHistoryNew?.some(
          h => h.categoryKey === categoryKey && h.completedAt
        );
        
        if (!isAlreadyInHistory) {
          // Mark as completed by moving to history
          if (!tenant.pillarHistoryNew) {
            tenant.pillarHistoryNew = [];
          }
          
          // Only mark if we have valid pillar data
          if (tenant.activePillar.categoryKey && 
              tenant.activePillar.pillarKeyword && 
              tenant.activePillar.createdAt) {
            tenant.pillarHistoryNew.push({
              categoryKey: tenant.activePillar.categoryKey,
              pillarKeyword: tenant.activePillar.pillarKeyword,
              targetSupportingCount: tenant.activePillar.targetSupportingCount || 30,
              createdAt: tenant.activePillar.createdAt,
              completedAt: new Date()
            });
            await tenant.save();
            console.log(`   ✅ Marked category ${categoryKey} as completed in history`);
          }
        }
      }
      
      allResults.push({
        categoryKey,
        pillarKeyword: activePillar.pillarKeyword,
        success: true,
        pagesCreated: pagesCreated.length,
        pages: pagesCreated.map(p => ({ title: p.title, slug: p.slug })),
        errors: result.errors || []
      });

      newlyProcessedCategories.add(categoryKey);

      console.log(`\n   ✅ Completed ${categoryKey}: Created ${pagesCreated.length} page(s)`);
      
      if (pagesCreated.length > 0) {
        pagesCreated.forEach((page, idx) => {
          console.log(`      ${idx + 1}. ${page.title}`);
        });
      }

    } catch (error) {
      console.error(`\n   ❌ Error processing ${categoryKey}:`, error.message);
      console.error(`   ⚠️  Processing stopped for this category.`);
      console.error(`   💡 The active pillar remains set to: ${categoryKey}`);
      console.error(`   🔄 Run the script again to resume from this category.`);
      
      allResults.push({
        categoryKey,
        success: false,
        error: error.message,
        pagesCreated: 0
      });
      
      // Save the current state before exiting
      // The active pillar is already set, so resumption will work on next run
      // Re-throw to stop processing and allow resumption on next run
      throw error;
    }
  }

  return allResults;
}

/**
 * Generate pages for a specific category
 */
async function generateForCategory(tenantId, categoryKey, countPerPillar) {
  const tenant = await TenantService.getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const categoryConfig = tenant.contentPillars?.find(c => c.categoryKey === categoryKey);
  if (!categoryConfig) {
    throw new Error(`Category ${categoryKey} not found in tenant's contentPillars`);
  }

  console.log(`\n📌 Processing Category: ${categoryKey}`);
  console.log(`   Description: ${categoryConfig.description}`);
  console.log('='.repeat(70) + '\n');

  try {
    // Activate this pillar category
    const activePillar = await activatePillarForCategory(tenantId, categoryKey);
    
    if (activePillar.categoryKey !== categoryKey) {
      throw new Error(`Could not activate ${categoryKey}, current active is ${activePillar.categoryKey}`);
    }

    console.log(`   ✅ Active Pillar: "${activePillar.pillarKeyword}" (category: ${categoryKey})`);

    // Generate pages for this pillar
    const options = { count: countPerPillar };
    const result = await GenerationService.runPillarGenerationForTenant(tenantId, options);

    const pagesCreated = result.pagesCreated || [];
    
    // Mark this category as completed in history (if not already there)
    const updatedTenant = await TenantService.getTenantById(tenantId);
    if (updatedTenant && updatedTenant.activePillar && updatedTenant.activePillar.categoryKey === categoryKey) {
      const isAlreadyInHistory = updatedTenant.pillarHistoryNew?.some(
        h => h.categoryKey === categoryKey && h.completedAt
      );
      
      if (!isAlreadyInHistory) {
        if (!updatedTenant.pillarHistoryNew) {
          updatedTenant.pillarHistoryNew = [];
        }
        
        if (updatedTenant.activePillar.categoryKey && 
            updatedTenant.activePillar.pillarKeyword && 
            updatedTenant.activePillar.createdAt) {
          updatedTenant.pillarHistoryNew.push({
            categoryKey: updatedTenant.activePillar.categoryKey,
            pillarKeyword: updatedTenant.activePillar.pillarKeyword,
            targetSupportingCount: updatedTenant.activePillar.targetSupportingCount || 30,
            createdAt: updatedTenant.activePillar.createdAt,
            completedAt: new Date()
          });
          await updatedTenant.save();
          console.log(`   ✅ Marked category ${categoryKey} as completed in history`);
        }
      }
    }
    
    return {
      categoryKey,
      pillarKeyword: activePillar.pillarKeyword,
      success: true,
      pagesCreated: pagesCreated.length,
      pages: pagesCreated.map(p => ({ title: p.title, slug: p.slug })),
      errors: result.errors || []
    };
  } catch (error) {
    console.error(`\n   ❌ Error processing ${categoryKey}:`, error.message);
    return {
      categoryKey,
      success: false,
      error: error.message,
      pagesCreated: 0
    };
  }
}

async function runPillarGeneration() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('❌ Usage: node scripts/run-pillar.js <domain> [--count N] [--category CATEGORY] [--slug SLUG] [--gen-logo]');
      console.error('');
      console.error('Examples:');
      console.error('   node scripts/run-pillar.js example.com');
      console.error('   node scripts/run-pillar.js example.com --count 3');
      console.error('   node scripts/run-pillar.js example.com --category technology');
      console.error('   node scripts/run-pillar.js example.com --slug how-to-use-ai');
      console.error('   node scripts/run-pillar.js example.com --gen-logo');
      console.error('');
      console.error('Options:');
      console.error('   --count N        Number of pages to create per pillar (default: 3)');
      console.error('   --category KEY   Process only the specified category');
      console.error('   --slug SLUG     Regenerate the page with the specified slug');
      console.error('   --gen-logo      Generate and set logo for tenant (does nothing else)');
      console.error('');
      console.error('This will create the specified number of pages for EACH pillar/category.');
      process.exit(1);
    }

    const domain = args[0];
    let countPerPillar = 3; // Default to 3 pages per pillar
    let targetCategory = null;
    let targetSlug = null;

    // Parse --count flag
    const countIndex = args.indexOf('--count');
    if (countIndex !== -1 && args[countIndex + 1]) {
      countPerPillar = parseInt(args[countIndex + 1]);
      if (isNaN(countPerPillar) || countPerPillar < 1 || countPerPillar > 10) {
        console.error('❌ --count must be a number between 1 and 10');
        process.exit(1);
      }
    }

    // Parse --category flag
    const categoryIndex = args.indexOf('--category');
    if (categoryIndex !== -1 && args[categoryIndex + 1]) {
      targetCategory = args[categoryIndex + 1];
    }

    // Parse --slug flag
    const slugIndex = args.indexOf('--slug');
    if (slugIndex !== -1 && args[slugIndex + 1]) {
      targetSlug = args[slugIndex + 1];
    }

    // Parse --gen-logo flag
    const genLogo = args.includes('--gen-logo');

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Resolve tenant by domain
    console.log(`🔍 Looking up tenant by domain: ${domain}`);
    const tenant = await TenantService.getTenantByDomain(domain);
    
    if (!tenant) {
      console.error(`❌ Tenant not found with domain: ${domain}`);
      console.error('   Make sure the tenant exists in the database');
      await mongoose.disconnect();
      process.exit(1);
    }

    const tenantId = tenant._id.toString();

    // Handle --gen-logo mode: generate logo only
    if (genLogo) {
      console.log(`\n🎨 LOGO GENERATION MODE: Generating logo for tenant`);
      console.log('='.repeat(70));
      console.log(`📋 Tenant: ${tenant.name} (${tenant.domain})`);
      
      if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY environment variable is not set');
        console.error('   Logo generation requires Gemini API key');
        await mongoose.disconnect();
        process.exit(1);
      }

      try {
        const logoUrl = await LogoService.generateLogoWithRetry(tenant, 2);
        
        if (logoUrl) {
          // Update tenant with generated logo
          const updatedTenant = await TenantService.getTenantById(tenantId);
          if (updatedTenant) {
            updatedTenant.logo = logoUrl;
            await updatedTenant.save();
            console.log(`\n✅ Logo generated and saved successfully!`);
            console.log(`   Logo URL: ${logoUrl}`);
            console.log('='.repeat(70) + '\n');
          } else {
            console.error('❌ Could not update tenant with logo');
          }
        } else {
          console.error(`\n❌ Failed to generate logo after retries`);
          console.error('   You can try again or set logo manually');
          await mongoose.disconnect();
          process.exit(1);
        }
      } catch (error) {
        console.error(`\n❌ Error generating logo:`, error.message);
        await mongoose.disconnect();
        process.exit(1);
      }

      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB\n');
      process.exit(0);
    }
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.domain})`);

    // Handle --slug mode: regenerate a specific page
    if (targetSlug) {
      console.log(`\n🔄 SLUG MODE: Regenerating page with slug: ${targetSlug}`);
      console.log('='.repeat(70));
      
      const page = await PageService.getPageBySlug(tenantId, targetSlug);
      if (!page) {
        console.error(`❌ Page not found with slug: ${targetSlug}`);
        await mongoose.disconnect();
        process.exit(1);
      }

      console.log(`📄 Found page: "${page.title}" (slug: ${page.slug})`);
      console.log(`🔄 Regenerating content for this page...\n`);

      try {
        const result = await MicrositeBuilderAgent.buildMicrosite(tenantId, [page.title]);
        
        if (result.errors && result.errors.length > 0) {
          console.error('❌ Errors during regeneration:');
          result.errors.forEach(err => console.error(`   - ${err.error || err}`));
        }

        if (result.pages && result.pages.length > 0) {
          console.log(`\n✅ Successfully regenerated page: "${page.title}"`);
          console.log('='.repeat(70) + '\n');
        } else {
          console.log(`\n⚠️  No pages were updated`);
        }
      } catch (error) {
        console.error(`\n❌ Error regenerating page:`, error.message);
        await mongoose.disconnect();
        process.exit(1);
      }

      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB\n');
      process.exit(0);
    }

    // Handle --category mode: process only specified category
    if (targetCategory) {
      console.log(`\n🎯 CATEGORY MODE: Processing only category: ${targetCategory}`);
      console.log('='.repeat(70));
      
      const categoryExists = tenant.contentPillars?.some(p => p.categoryKey === targetCategory);
      if (!categoryExists) {
        console.error(`❌ Category "${targetCategory}" not found in tenant's contentPillars`);
        console.error(`   Available categories: ${tenant.contentPillars?.map(p => p.categoryKey).join(', ') || 'none'}`);
        await mongoose.disconnect();
        process.exit(1);
      }

      // Process only the specified category
      const results = await generateForCategory(tenantId, targetCategory, countPerPillar);
      
      // Print summary
      console.log('\n' + '='.repeat(70));
      console.log('📊 FINAL SUMMARY');
      console.log('='.repeat(70));
      
      if (results.success) {
        console.log(`✅ ${results.categoryKey} (${results.pillarKeyword}): ${results.pagesCreated} page(s)`);
        if (results.errors && results.errors.length > 0) {
          console.log(`⚠️  Errors: ${results.errors.length}`);
        }
      } else {
        console.log(`❌ ${results.categoryKey}: Failed - ${results.error}`);
      }
      
      console.log('='.repeat(70) + '\n');
      
      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB\n');
      process.exit(0);
    }

    // Normal mode: process all pillars
    console.log(`📝 Will create ${countPerPillar} page(s) for each pillar\n`);

    // Show resumption status before starting
    const activePillar = tenant.activePillar;
    if (activePillar && activePillar.categoryKey) {
      const processedCategories = getProcessedCategories(tenant);
      const isProcessed = processedCategories.has(activePillar.categoryKey);
      
      if (!isProcessed) {
        console.log(`🔄 RESUMPTION MODE:`);
        console.log(`   Previous run was interrupted during: ${activePillar.categoryKey}`);
        console.log(`   Will resume from this category\n`);
      }
    }

    // Generate for all pillars
    const results = await generateForAllPillars(tenantId, countPerPillar);

    // Print final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70));
    
    let totalPagesCreated = 0;
    let totalErrors = 0;

    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ ${result.categoryKey} (${result.pillarKeyword}): ${result.pagesCreated} page(s)`);
        totalPagesCreated += result.pagesCreated;
        totalErrors += result.errors?.length || 0;
      } else {
        console.log(`❌ ${result.categoryKey}: Failed - ${result.error}`);
        totalErrors++;
      }
    });

    console.log('\n' + '-'.repeat(70));
    console.log(`📝 Total pages created: ${totalPagesCreated}`);
    console.log(`⚠️  Total errors: ${totalErrors}`);
    console.log(`✅ Processed ${results.length} pillar(s)`);
    console.log('='.repeat(70) + '\n');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Fatal error:', error.message);
    console.error('='.repeat(70));
    
    // Get tenant again to show current state
    try {
      const tenant = await TenantService.getTenantByDomain(process.argv[2]);
      if (tenant) {
        const activePillar = tenant.activePillar;
        if (activePillar && activePillar.categoryKey) {
          console.error(`\n💡 Current state:`);
          console.error(`   📌 Active pillar category: ${activePillar.categoryKey}`);
          console.error(`   📝 Pillar keyword: "${activePillar.pillarKeyword}"`);
          console.error(`\n🔄 To resume:`);
          console.error(`   Run the script again: node scripts/run-pillar.js ${tenant.domain}`);
          console.error(`   It will automatically resume from: ${activePillar.categoryKey}`);
        }
      }
    } catch (err) {
      // Ignore errors when trying to show state
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

runPillarGeneration();
