/**
 * CLI script to publish a page
 * 
 * Usage:
 *   node scripts/publish-page.js <domain> <slug>
 * 
 * Examples:
 *   node scripts/publish-page.js example.com how-to-setup-smart-home
 *   node scripts/publish-page.js example.com smart-plug-guide
 * 
 * This will:
 * 1. Set published = true for the page
 * 2. Update sitemap
 * 3. Generate internal links
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Import all models to ensure they're registered with Mongoose
import '../src/models/Tenant.js';
import '../src/models/Page.js';

// Now import services
import { TenantService } from '../src/services/TenantService.js';
import { PageService } from '../src/services/PageService.js';
import { SitemapService } from '../src/services/SitemapService.js';
import { InternalLinkingService } from '../src/services/InternalLinkingService.js';
import Page from '../src/models/Page.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

/**
 * Generate related pages items (3-4 links max)
 */
function generateRelatedPagesItems(relatedPages, currentPageSlug) {
  if (!relatedPages || relatedPages.length === 0) {
    return [];
  }

  // Randomly choose between 3-4 links max
  const maxLinks = Math.floor(Math.random() * 2) + 3; // Returns 3 or 4

  // Filter out current page and limit to maxLinks
  const linksToAdd = relatedPages
    .filter(page => page.slug !== currentPageSlug)
    .slice(0, maxLinks);

  if (linksToAdd.length === 0) {
    return [];
  }

  // Generate related pages items with title, slug, categoryKey, and full href path
  return linksToAdd.map(page => ({
    title: page.title,
    slug: page.slug,
    categoryKey: page.categoryKey || '',
    href: page.categoryKey ? `/${page.categoryKey}/${page.slug}` : `/${page.slug}`
  }));
}

/**
 * Add relatedPages section to uxLayout
 * Removes any existing relatedPages sections first, then creates a new one
 */
function addRelatedPagesSection(uxLayout, relatedPages, currentPageSlug) {
  // Ensure uxLayout structure exists
  if (!uxLayout) {
    uxLayout = { sections: [] };
  }
  if (!uxLayout.sections) {
    uxLayout.sections = [];
  }

  // Generate related pages items
  const relatedPagesItems = generateRelatedPagesItems(relatedPages, currentPageSlug);

  if (relatedPagesItems.length === 0) {
    return { uxLayout, added: false };
  }

  // Remove all existing relatedPages sections
  const beforeCount = uxLayout.sections.length;
  uxLayout.sections = uxLayout.sections.filter(section => section.type !== 'relatedPages');
  const removedCount = beforeCount - uxLayout.sections.length;
  
  if (removedCount > 0) {
    console.log(`   🗑️  Removed ${removedCount} existing relatedPages section(s)`);
  }

  // Create new relatedPages section at the end
  uxLayout.sections.push({
    type: 'relatedPages',
    title: 'Related Articles',
    items: relatedPagesItems
  });

  return { uxLayout, added: true, count: relatedPagesItems.length };
}

/**
 * Process page to add related pages section (if it has a category)
 */
async function addRelatedPagesToPage(page, tenantId) {
  // Skip standalone pages
  if (page.isStandalone || !page.categoryKey) {
    return { success: false, reason: 'Not a category page' };
  }

  try {
    // Get all pages in the same category (excluding standalone pages and current page)
    const allPages = await PageService.getAllPagesForTenant(tenantId, false);
    const categoryPages = allPages
      .filter(p => 
        p.categoryKey === page.categoryKey && 
        !p.isStandalone &&
        p._id.toString() !== page._id.toString() &&
        p.published === true // Only include published pages
      )
      .map(p => ({
        ...p,
        categoryKey: p.categoryKey || page.categoryKey
      }));

    if (categoryPages.length === 0) {
      return { success: false, reason: 'No related pages found in category' };
    }

    // Get current uxLayout
    let uxLayout = page.uxLayout || { sections: [] };
    
    // Add relatedPages section
    const result = addRelatedPagesSection(
      JSON.parse(JSON.stringify(uxLayout)), // Deep clone
      categoryPages,
      page.slug
    );

    if (!result.added) {
      return { success: false, reason: 'No related pages to add' };
    }

    // Update page if uxLayout changed
    const layoutChanged = JSON.stringify(uxLayout) !== JSON.stringify(result.uxLayout);
    
    if (layoutChanged) {
      await PageService.updatePage(page._id, {
        uxLayout: result.uxLayout
      });
      return { success: true, linksAdded: result.count };
    } else {
      return { success: true, linksAdded: 0, noChange: true };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function publishPage() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('❌ Usage: node scripts/publish-page.js <domain> <slug>');
      console.error('');
      console.error('Examples:');
      console.error('   node scripts/publish-page.js example.com how-to-setup-smart-home');
      console.error('   node scripts/publish-page.js example.com smart-plug-guide');
      console.error('');
      process.exit(1);
    }

    const domain = args[0];
    const slug = args[1];

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
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.domain})\n`);

    // Find page by slug
    console.log(`🔍 Looking up page with slug: ${slug}`);
    const page = await PageService.getPageBySlug(tenantId, slug, true); // Include unpublished
    
    if (!page) {
      console.error(`❌ Page not found with slug: ${slug}`);
      console.error('   Make sure the page exists in the database');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found page: "${page.title}" (slug: ${page.slug})`);
    console.log(`   Current published status: ${page.published ? 'Published' : 'Unpublished'}\n`);

    if (page.published) {
      console.log('ℹ️  Page is already published. Updating sitemap and links anyway...\n');
    }

    // 1. Publish the page
    console.log('📝 Step 1: Publishing page...');
    const updatedPage = await PageService.updatePage(page._id, {
      published: true
    });

    if (!updatedPage) {
      console.error('❌ Failed to update page');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('✅ Page published successfully\n');

    // 2. Update sitemap
    console.log('🗺️  Step 2: Updating sitemap...');
    try {
      await SitemapService.updateSitemap(tenantId);
      console.log('✅ Sitemap updated successfully\n');
    } catch (error) {
      console.error('❌ Error updating sitemap:', error.message);
      console.error('   Continuing with internal linking...\n');
    }

    // 3. Generate internal links
    console.log('🔗 Step 3: Generating internal links...');
    try {
      await InternalLinkingService.refreshAllLinks(tenantId);
      console.log('✅ Internal links generated successfully\n');
    } catch (error) {
      console.error('❌ Error generating internal links:', error.message);
      console.error('   Page is published, but links may need manual review\n');
    }

    // 4. Add related pages section (if page has a category)
    console.log('📎 Step 4: Adding related pages section...');
    try {
      // Re-fetch page to get latest data
      const latestPage = await PageService.getPageBySlug(tenantId, slug, true);
      
      if (latestPage) {
        const result = await addRelatedPagesToPage(latestPage, tenantId);
        
        if (result.success) {
          if (result.linksAdded > 0) {
            console.log(`✅ Added related pages section with ${result.linksAdded} links\n`);
          } else if (result.noChange) {
            console.log('ℹ️  Related pages section already exists or no changes needed\n');
          } else {
            console.log(`ℹ️  ${result.reason || 'No related pages to add'}\n`);
          }
        } else {
          if (result.reason === 'Not a category page') {
            console.log('ℹ️  Skipping related pages (standalone page)\n');
          } else {
            console.log(`⚠️  ${result.reason || result.error || 'Could not add related pages'}\n`);
          }
        }
      } else {
        console.log('⚠️  Could not fetch page for related pages processing\n');
      }
    } catch (error) {
      console.error('❌ Error adding related pages:', error.message);
      console.error('   Page is published, but related pages may need manual review\n');
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 PUBLISH SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Page: "${updatedPage.title}"`);
    console.log(`   Slug: ${updatedPage.slug}`);
    console.log(`   Status: Published`);
    console.log(`   Sitemap: Updated`);
    console.log(`   Internal Links: Generated`);
    
    // Check if related pages were added
    const finalPage = await PageService.getPageBySlug(tenantId, slug, true);
    if (finalPage && finalPage.categoryKey && !finalPage.isStandalone) {
      const hasRelatedSection = finalPage.uxLayout?.sections?.some(s => s.type === 'relatedPages');
      if (hasRelatedSection) {
        const relatedSection = finalPage.uxLayout.sections.find(s => s.type === 'relatedPages');
        console.log(`   Related Pages: Added (${relatedSection?.items?.length || 0} links)`);
      } else {
        console.log(`   Related Pages: Not added (no related pages found)`);
      }
    }
    
    console.log('='.repeat(70) + '\n');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Fatal error:', error.message);
    console.error('='.repeat(70));
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

publishPage();

