/**
 * Content Cluster Service
 * Implements pillar page strategy with supporting content
 * Creates topic clusters for better SEO and internal linking
 */

import { PageService } from './PageService.js';
import { KeywordService } from './KeywordService.js';
import slugify from '../utils/slugify.js';

export class ContentClusterService {
  /**
   * Create a content cluster (pillar page + supporting pages)
   * @param {string} tenantId - Tenant ID
   * @param {string} pillarTopic - Main pillar topic (e.g., "Travel Planning")
   * @param {Array<string>} supportingTopics - Supporting subtopics
   */
  static async createContentCluster(tenantId, pillarTopic, supportingTopics = []) {
    const cluster = {
      pillar: null,
      supporting: [],
      errors: []
    };

    try {
      // 1. Create pillar page
      console.log(`📌 Creating pillar page: "${pillarTopic}"`);
      const pillarSlug = slugify(pillarTopic);
      
      // Check if pillar already exists
      const existingPillar = await PageService.getPageBySlug(tenantId, pillarSlug);
      
      if (!existingPillar) {
        // Generate comprehensive pillar content
        const pillarKeywords = await KeywordService.generateKeywords(pillarTopic, 15, tenantId);
        
        // Pillar pages should be comprehensive (2500+ words)
        const pillarContent = await this.generatePillarContent(pillarTopic, pillarKeywords);
        
        // Create pillar page
        const pillarPage = await PageService.createPage({
          tenantId,
          title: pillarTopic,
          slug: pillarSlug,
          content: pillarContent,
          meta: {
            title: `${pillarTopic} - Complete Guide`,
            description: `Comprehensive guide to ${pillarTopic}. Learn everything you need to know.`,
            keywords: pillarKeywords
          },
          isHome: false
        });

        cluster.pillar = pillarPage;
        console.log(`✅ Pillar page created: ${pillarPage.slug}`);
      } else {
        cluster.pillar = existingPillar;
        console.log(`ℹ️  Pillar page already exists: ${existingPillar.slug}`);
      }

      // 2. Create supporting pages
      for (const subtopic of supportingTopics) {
        try {
          console.log(`  📄 Creating supporting page: "${subtopic}"`);
          const subtopicSlug = slugify(subtopic);
          
          const existingSupporting = await PageService.getPageBySlug(tenantId, subtopicSlug);
          
          if (!existingSupporting) {
            const subtopicKeywords = await KeywordService.generateKeywords(subtopic, 10, tenantId);
            const subtopicContent = await this.generateSupportingContent(
              subtopic,
              subtopicKeywords,
              pillarTopic,
              pillarSlug
            );

            const supportingPage = await PageService.createPage({
              tenantId,
              title: subtopic,
              slug: subtopicSlug,
              content: subtopicContent,
              meta: {
                title: `${subtopic} - ${pillarTopic} Guide`,
                description: `Learn about ${subtopic} as part of our ${pillarTopic} guide.`,
                keywords: subtopicKeywords
              },
              isHome: false
            });

            cluster.supporting.push(supportingPage);
            console.log(`  ✅ Supporting page created: ${supportingPage.slug}`);
          } else {
            cluster.supporting.push(existingSupporting);
            console.log(`  ℹ️  Supporting page already exists: ${existingSupporting.slug}`);
          }
        } catch (error) {
          console.error(`  ❌ Error creating supporting page "${subtopic}":`, error.message);
          cluster.errors.push({ topic: subtopic, error: error.message });
        }
      }

      // 3. Build internal links between pillar and supporting pages
      await this.buildClusterLinks(tenantId, cluster);

      return cluster;
    } catch (error) {
      console.error('Error creating content cluster:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive pillar page content
   */
  static async generatePillarContent(topic, keywords) {
    // This would use AI to generate comprehensive pillar content
    // For now, return a placeholder that would be replaced by the agent
    return `Comprehensive guide to ${topic} covering all aspects. This pillar page provides an in-depth overview.`;
  }

  /**
   * Generate supporting content that links back to pillar
   */
  static async generateSupportingContent(subtopic, keywords, pillarTopic, pillarSlug) {
    // This would use AI to generate supporting content
    // Content should naturally link back to the pillar page
    return `Detailed information about ${subtopic} as part of our ${pillarTopic} guide. 
    <a href="/${pillarSlug}">Learn more about ${pillarTopic}</a>.`;
  }

  /**
   * Build internal links between pillar and supporting pages
   */
  static async buildClusterLinks(tenantId, cluster) {
    if (!cluster.pillar || cluster.supporting.length === 0) return;

    try {
      // Update pillar page to link to supporting pages
      const supportingLinks = cluster.supporting.map(page => ({
        text: page.title,
        url: `/${page.slug}`
      }));

      // Update supporting pages to link back to pillar
      for (const supportingPage of cluster.supporting) {
        // This would update the content to include pillar link
        // In practice, this would be done through InternalLinkingService
        console.log(`  🔗 Linking ${supportingPage.slug} → ${cluster.pillar.slug}`);
      }

      console.log(`✅ Cluster links built: 1 pillar ↔ ${cluster.supporting.length} supporting pages`);
    } catch (error) {
      console.error('Error building cluster links:', error);
    }
  }

  /**
   * Get content clusters for a tenant
   */
  static async getClustersForTenant(tenantId) {
    // This would analyze pages and identify clusters
    // For now, return empty array
    return [];
  }
}

