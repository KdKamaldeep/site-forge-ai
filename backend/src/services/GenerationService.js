/**
 * GenerationService
 * Main pillar-based generation loop
 */

import { TenantService } from './TenantService.js';
import { PillarService } from './PillarService.js';
import { ClusterService } from './ClusterService.js';
import { MicrositeBuilderAgent } from '../agents/micrositeBuilderAgent.js';
import { InternalLinkingService } from './InternalLinkingService.js';
import { PageService } from './PageService.js';

export class GenerationService {
  /**
   * Run pillar generation for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {object} options - Options
   * @param {number} options.count - Number of pages to create (default: from tenant config, max 4)
   * @returns {object} Results
   */
  static async runPillarGenerationForTenant(tenantId, options = {}) {
    const startTime = Date.now();
    const results = {
      tenantId,
      pagesCreated: [],
      errors: [],
      stats: {
        plannedTopics: 0,
        createdPages: 0,
        pillarComplete: false
      }
    };

    try {
      // 1. Load tenant and ensure active pillar
      const tenant = await TenantService.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      console.log(`\n🚀 Starting pillar generation for: ${tenant.name} (${tenant.domain})`);

      // 2. Initialize pillar if needed
      const activePillar = await PillarService.initializePillarIfNeeded(tenantId);
      console.log(`📌 Active Pillar: "${activePillar.pillarKeyword}" (category: ${activePillar.categoryKey})`);

      // 3. Load or create cluster
      const cluster = await ClusterService.getOrCreateCluster(tenantId);
      const stats = await ClusterService.getClusterStats(tenantId);
      results.stats.plannedTopics = stats.planned;

      console.log(`📊 Cluster Stats: ${stats.created}/${stats.total} created, ${stats.planned} planned`);

      // 4. Determine how many pages to create
      let pagesToCreate = options.count;
      if (!pagesToCreate) {
        // Get from tenant config
        const category = tenant.contentPillars?.find(c => c.categoryKey === activePillar.categoryKey);
        pagesToCreate = category?.postingRatePerWeek || tenant.publishingStrategy?.pagesPerWeek || 2;
      }

      // Cap to 1-4 for safety
      pagesToCreate = Math.max(1, Math.min(4, pagesToCreate));

      console.log(`📝 Planning to create ${pagesToCreate} page(s) this run`);

      // 5. Get next planned topics
      const plannedTopics = await ClusterService.getNextPlannedTopics(tenantId, pagesToCreate);

      if (plannedTopics.length === 0) {
        console.log('⚠️  No planned topics available. Checking if pillar is complete...');
        const isComplete = await PillarService.isPillarComplete(tenantId, cluster);
        if (isComplete) {
          console.log('✅ Pillar is complete. Finalizing...');
          await PillarService.completePillarAndSelectNext(tenantId);
          results.stats.pillarComplete = true;
        }
        return results;
      }

      // 6. Create pages for each topic
      const topicsToProcess = plannedTopics.map(t => t.keyword);
      console.log(`\n📄 Processing ${topicsToProcess.length} topic(s):`);
      topicsToProcess.forEach((topic, i) => {
        console.log(`   ${i + 1}. ${topic}`);
      });

      const pageResults = await MicrositeBuilderAgent.buildMicrosite(tenantId, topicsToProcess);

      // 7. Mark topics as created and set page metadata
      for (const pageResult of pageResults.pages) {
        try {
          const topic = plannedTopics.find(t => 
            t.keyword === pageResult.title || 
            t.suggestedSlug === pageResult.slug
          );

          if (topic) {
            // Mark topic as created
            await ClusterService.markTopicCreated(tenantId, topic.keyword, pageResult._id);

            // Update page with category and primary keyword
            const page = await PageService.getPageById(pageResult._id);
            if (page) {
              page.categoryKey = activePillar.categoryKey;
              page.primaryKeyword = topic.keyword;
              await page.save();
            }

            results.pagesCreated.push({
              pageId: pageResult._id,
              title: pageResult.title,
              slug: pageResult.slug,
              keyword: topic.keyword
            });
          }
        } catch (error) {
          console.error(`Error processing page result:`, error.message);
          results.errors.push({
            page: pageResult.title,
            error: error.message
          });
        }
      }

      results.stats.createdPages = results.pagesCreated.length;

      // 8. Skip internal linking for unpublished pages
      // Internal linking will be done when pages are published via publish-page.js script
      console.log('\n⏭️  Skipping internal linking (pages are unpublished)');
      console.log('   Run publish-page.js script to publish pages and update internal links');

      // 9. Check if pillar is complete
      const updatedCluster = await ClusterService.getOrCreateCluster(tenantId);
      const isComplete = await PillarService.isPillarComplete(tenantId, updatedCluster);

      if (isComplete) {
        console.log('\n✅ Pillar is complete! Finalizing and selecting next pillar...');
        await PillarService.completePillarAndSelectNext(tenantId);
        results.stats.pillarComplete = true;
      }

      // 10. Final stats
      const finalStats = await ClusterService.getClusterStats(tenantId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n✅ Generation complete in ${duration}s`);
      console.log(`📊 Final Stats: ${finalStats.created}/${finalStats.total} created, ${finalStats.planned} planned`);
      if (results.stats.pillarComplete) {
        console.log(`🎉 Pillar completed! Next pillar selected.`);
      }

      results.stats.finalStats = finalStats;
      results.stats.duration = duration;

      return results;
    } catch (error) {
      console.error('❌ Generation error:', error.message);
      results.errors.push({
        step: 'generation',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Run generation for all tenants (for scheduler)
   */
  static async runForAllTenants() {
    const tenants = await TenantService.listTenants();
    const results = [];

    console.log(`\n🌍 Running pillar generation for ${tenants.length} tenant(s)...\n`);

    for (const tenant of tenants) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        const result = await this.runPillarGenerationForTenant(tenant._id.toString());
        results.push({
          tenantId: tenant._id.toString(),
          tenantName: tenant.name,
          success: true,
          ...result
        });
      } catch (error) {
        console.error(`❌ Failed for tenant ${tenant.name}:`, error.message);
        results.push({
          tenantId: tenant._id.toString(),
          tenantName: tenant.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

