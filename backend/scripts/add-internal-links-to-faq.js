/**
 * Script to generate internal links and append them to FAQ sections
 * 
 * Usage:
 *   node scripts/add-internal-links-to-faq.js <tenantId> <category> [slug]
 * 
 * Examples:
 *   # Process all pages in a category
 *   node scripts/add-internal-links-to-faq.js 507f1f77bcf86cd799439011 nutrition
 * 
 *   # Process a specific page
 *   node scripts/add-internal-links-to-faq.js 507f1f77bcf86cd799439011 nutrition healthy-breakfast-ideas
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import '../src/models/Tenant.js';
import '../src/models/Page.js';

// Import services
import { PageService } from '../src/services/PageService.js';
import Page from '../src/models/Page.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

/**
 * Generate internal links as FAQ items for related pages
 */
function generateInternalLinksAsFAQ(relatedPages, currentPageSlug, maxLinks = 5) {
  if (!relatedPages || relatedPages.length === 0) {
    return [];
  }

  // Filter out current page and limit to maxLinks
  const linksToAdd = relatedPages
    .filter(page => page.slug !== currentPageSlug)
    .slice(0, maxLinks);

  if (linksToAdd.length === 0) {
    return [];
  }

  // Generate FAQ items for each related page
  return linksToAdd.map(page => ({
    question: `Learn more about ${page.title}`,
    answer: `<p>Read our comprehensive guide: <a href="/${page.slug}">${page.title}</a></p>`
  }));
}

/**
 * Add internal links to FAQ section of a page
 */
function addLinksToFAQSection(uxLayout, relatedPages, currentPageSlug) {
  // Ensure uxLayout structure exists
  if (!uxLayout) {
    uxLayout = { sections: [] };
  }
  if (!uxLayout.sections) {
    uxLayout.sections = [];
  }

  // Generate FAQ items from related pages
  const newFAQItems = generateInternalLinksAsFAQ(relatedPages, currentPageSlug);

  if (newFAQItems.length === 0) {
    console.log('   ⚠️  No related pages found to link to');
    return uxLayout;
  }

  // Find existing FAQ section
  let faqSectionIndex = uxLayout.sections.findIndex(section => section.type === 'faq');

  if (faqSectionIndex === -1) {
    // Create new FAQ section at the end
    uxLayout.sections.push({
      type: 'faq',
      title: 'Related Articles',
      items: newFAQItems
    });
    console.log(`   ✅ Created new FAQ section with ${newFAQItems.length} links`);
  } else {
    // Append to existing FAQ section
    const existingFAQ = uxLayout.sections[faqSectionIndex];
    if (!existingFAQ.items) {
      existingFAQ.items = [];
    }

    // Check if links already exist (by slug)
    const existingSlugs = new Set(
      existingFAQ.items
        .map(item => {
          // Extract slug from existing links
          const match = item.answer?.match(/href="\/([^"]+)"/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    // Add only new links
    const newItemsToAdd = newFAQItems.filter(item => {
      const match = item.answer.match(/href="\/([^"]+)"/);
      const slug = match ? match[1] : null;
      return slug && !existingSlugs.has(slug);
    });

    if (newItemsToAdd.length > 0) {
      existingFAQ.items = [...existingFAQ.items, ...newItemsToAdd];
      console.log(`   ✅ Added ${newItemsToAdd.length} new links to existing FAQ section (total: ${existingFAQ.items.length} items)`);
    } else {
      console.log('   ℹ️  All links already exist in FAQ section');
    }
  }

  return uxLayout;
}

/**
 * Process a single page
 */
async function processPage(page, tenantId, categoryKey) {
  try {
    console.log(`\n📄 Processing: ${page.title} (${page.slug})`);

    // Get all pages in the same category (excluding standalone pages)
    const allPages = await PageService.getAllPagesForTenant(tenantId, false);
    const categoryPages = allPages.filter(p => 
      p.categoryKey === categoryKey && 
      !p.isStandalone &&
      p._id.toString() !== page._id.toString()
    );

    console.log(`   Found ${categoryPages.length} related pages in category "${categoryKey}"`);

    if (categoryPages.length === 0) {
      console.log('   ⚠️  No related pages found in this category');
      return { success: false, reason: 'No related pages' };
    }

    // Get or create uxLayout from the page object (already has all data)
    let uxLayout = page.uxLayout || { sections: [] };
    
    // Add internal links to FAQ section
    const updatedUXLayout = addLinksToFAQSection(
      JSON.parse(JSON.stringify(uxLayout)), // Deep clone
      categoryPages,
      page.slug
    );

    // Update page if uxLayout changed
    const layoutChanged = JSON.stringify(uxLayout) !== JSON.stringify(updatedUXLayout);
    
    if (layoutChanged) {
      await PageService.updatePage(page._id, {
        uxLayout: updatedUXLayout
      });
      console.log(`   ✅ Page updated successfully`);
      return { success: true, linksAdded: categoryPages.length };
    } else {
      console.log('   ℹ️  No changes needed');
      return { success: true, linksAdded: 0, noChange: true };
    }
  } catch (error) {
    console.error(`   ❌ Error processing page: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Usage: node scripts/add-internal-links-to-faq.js <tenantId> <category> [slug]');
    console.error('');
    console.error('Examples:');
    console.error('  # Process all pages in a category');
    console.error('  node scripts/add-internal-links-to-faq.js 507f1f77bcf86cd799439011 nutrition');
    console.error('');
    console.error('  # Process a specific page');
    console.error('  node scripts/add-internal-links-to-faq.js 507f1f77bcf86cd799439011 nutrition healthy-breakfast-ideas');
    process.exit(1);
  }

  const [tenantId, categoryKey, slug] = args;

  // Validate tenantId
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error(`❌ Invalid tenantId: ${tenantId}`);
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get pages to process
    let pagesToProcess = [];

    if (slug) {
      // Process specific page - use Page model directly to get full object with uxLayout
      const page = await Page.findOne({ 
        tenantId: new mongoose.Types.ObjectId(tenantId),
        slug: slug.toLowerCase().trim()
      }).lean();

      if (!page) {
        console.error(`❌ Page not found: slug "${slug}" for tenant ${tenantId}`);
        process.exit(1);
      }

      // Verify category matches
      if (page.categoryKey !== categoryKey) {
        console.error(`❌ Page category "${page.categoryKey}" does not match specified category "${categoryKey}"`);
        process.exit(1);
      }

      pagesToProcess = [page];
      console.log(`\n🎯 Processing single page: ${page.title}`);
    } else {
      // Process all pages in category - get full page objects with uxLayout
      const categoryPages = await Page.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        categoryKey: categoryKey,
        isStandalone: { $ne: true }
      }).lean();

      if (categoryPages.length === 0) {
        console.error(`❌ No pages found for tenant ${tenantId} in category "${categoryKey}"`);
        process.exit(1);
      }

      pagesToProcess = categoryPages;
      console.log(`\n🎯 Processing ${pagesToProcess.length} pages in category "${categoryKey}"`);
    }

    // Process each page
    const results = [];
    for (const page of pagesToProcess) {
      const result = await processPage(page, tenantId, categoryKey);
      results.push({
        pageId: page._id,
        slug: page.slug,
        title: page.title,
        ...result
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const withChanges = results.filter(r => r.success && !r.noChange);

    console.log(`Total pages processed: ${results.length}`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📝 Pages updated: ${withChanges.length}`);

    if (failed.length > 0) {
      console.log('\nFailed pages:');
      failed.forEach(r => {
        console.log(`  - ${r.title} (${r.slug}): ${r.error || r.reason}`);
      });
    }

    console.log('\n✅ Script completed');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run script
main();
