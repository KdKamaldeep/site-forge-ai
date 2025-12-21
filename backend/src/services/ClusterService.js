/**
 * ClusterService
 * Manages KeywordCluster: creating/loading/updating supporting topics
 */

import KeywordCluster from '../models/KeywordCluster.js';
import { TenantService } from './TenantService.js';
import { PageService } from './PageService.js';
import { PillarService } from './PillarService.js';
import { generateText } from './AIProviderService.js';
import slugify from '../utils/slugify.js';

export class ClusterService {
  /**
   * Get or create cluster for active pillar
   */
  static async getOrCreateCluster(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Ensure active pillar exists
    const activePillar = await PillarService.initializePillarIfNeeded(tenantId);
    if (!activePillar) {
      throw new Error('No active pillar found');
    }

    // Find or create cluster
    let cluster = await KeywordCluster.findOne({
      tenantId,
      categoryKey: activePillar.categoryKey,
      pillarKeyword: activePillar.pillarKeyword
    });

    if (!cluster) {
      cluster = await KeywordCluster.create({
        tenantId,
        categoryKey: activePillar.categoryKey,
        pillarKeyword: activePillar.pillarKeyword,
        supportingTopics: []
      });
      console.log(`✅ Created new KeywordCluster for pillar: "${activePillar.pillarKeyword}"`);
    }

    // If cluster has no supporting topics, generate them
    if (!cluster.supportingTopics || cluster.supportingTopics.length === 0) {
      await this.generateSupportingTopics(tenantId, cluster);
    } else {
      // Check if all existing topics are processed (created or skipped)
      const allProcessed = cluster.supportingTopics.every(t => 
        t.status === 'created' || t.status === 'skipped'
      );
      
      // If all topics are processed, generate 40 new topics
      if (allProcessed) {
        console.log(`📊 All ${cluster.supportingTopics.length} topics processed. Generating 40 new topics...`);
        await this.generateSupportingTopics(tenantId, cluster, true); // append = true
      }
    }

    return cluster;
  }

  /**
   * Generate 40 supporting topics for a pillar
   * @param {boolean} append - If true, appends new topics to existing ones (for when all topics are processed)
   */
  static async generateSupportingTopics(tenantId, cluster, append = false) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const brandName = tenant.brandIdentity?.brandName || tenant.name;
    const tone = tenant.brandIdentity?.tone || 'friendly';
    const forbiddenTopics = tenant.compliance?.forbiddenTopics || [];
    const category = tenant.contentPillars?.find(c => c.categoryKey === cluster.categoryKey);

    // Get existing page slugs to avoid duplicates
    const existingPages = await PageService.getAllPagesForTenant(tenantId);
    const existingSlugs = new Set(existingPages.map(p => p.slug));
    
    // Get existing topic keywords and slugs from cluster to avoid duplicates
    const existingTopicKeywords = new Set();
    const existingTopicSlugs = new Set();
    if (cluster.supportingTopics && cluster.supportingTopics.length > 0) {
      cluster.supportingTopics.forEach(t => {
        if (t.keyword) existingTopicKeywords.add(t.keyword.toLowerCase());
        if (t.suggestedSlug) existingTopicSlugs.add(t.suggestedSlug);
      });
    }

    // Build list of existing topics to avoid duplicates
    const existingTopicsList = cluster.supportingTopics && cluster.supportingTopics.length > 0
      ? cluster.supportingTopics.slice(0, 10).map(t => `"${t.keyword}"`).join(', ')
      : 'none';
    
    const duplicateWarning = append && existingTopicsList !== 'none'
      ? `\nCRITICAL: These topics already exist in the cluster. DO NOT duplicate them:\n${existingTopicsList}\n\nGenerate completely NEW and DIFFERENT topics that are still related to the pillar.`
      : '';

    const prompt = `You are an SEO content strategist. Generate 40 long-tail supporting topic keywords for the pillar keyword "${cluster.pillarKeyword}" in the category "${cluster.categoryKey}".

REQUIREMENTS:
- Each topic must be a long-tail keyword (3-6 words)
- Must be related to the pillar "${cluster.pillarKeyword}"
- Must fit the category: ${category?.description || cluster.categoryKey}
- Brand tone: ${tone}
- Brand: ${brandName}
${duplicateWarning}
${forbiddenTopics.length > 0 ? `- NEVER use these forbidden topics: ${forbiddenTopics.join(', ')}` : ''}

Return JSON array of objects:
[
  {
    "keyword": "long-tail keyword phrase",
    "intent": "informational|commercial|lead",
    "suggestedSlug": "kebab-case-slug",
    "categoryKey": "${cluster.categoryKey}",
    "whyThisTopic": "short reason"
  }
]

Ensure:
- All suggestedSlug values are unique
- All keywords are unique${append ? ' and different from existing topics' : ''}
- All slugs are kebab-case (lowercase, hyphens, no spaces)
- Mix of informational (70%), commercial (20%), lead (10%) intent`;

    try {
      const content = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are an SEO expert. Return a valid JSON array of topic objects. The response must be a JSON array starting with [ and ending with ].',
        temperature: 0.8,
        maxTokens: 3000,
        jsonMode: false // Keep false to allow arrays
      });
      console.log(`📝 Raw AI response (first 200 chars): ${content.substring(0, 200)}...`);
      
      let topics = [];

      // Try to parse JSON - handle multiple formats
      try {
        // First, try to clean the content (remove markdown code blocks if present)
        let cleanedContent = content;
        
        // Remove markdown code blocks
        cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Try direct parse
        const parsed = JSON.parse(cleanedContent);
        
        // Handle different response formats
        if (Array.isArray(parsed)) {
          topics = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Look for array in common property names
          if (Array.isArray(parsed.topics)) {
            topics = parsed.topics;
          } else if (Array.isArray(parsed.supportingTopics)) {
            topics = parsed.supportingTopics;
          } else if (Array.isArray(parsed.items)) {
            topics = parsed.items;
          } else if (Array.isArray(parsed.data)) {
            topics = parsed.data;
          } else {
            // Extract first array found in object values
            const arrays = Object.values(parsed).filter(v => Array.isArray(v));
            if (arrays.length > 0) {
              topics = arrays[0];
            } else {
              throw new Error('No array found in response object');
            }
          }
        } else {
          throw new Error('Response is not an array or object');
        }
      } catch (parseError) {
        console.error(`⚠️  JSON parse error: ${parseError.message}`);
        console.log(`📄 Full response content: ${content}`);
        
        // Fallback: try to extract JSON array from text
        const jsonArrayMatch = content.match(/\[[\s\S]*\]/);
        if (jsonArrayMatch) {
          try {
            topics = JSON.parse(jsonArrayMatch[0]);
            console.log(`✅ Extracted array from text (${topics.length} items)`);
          } catch (extractError) {
            console.error(`❌ Failed to parse extracted array: ${extractError.message}`);
            throw new Error(`Could not parse JSON from response: ${parseError.message}`);
          }
        } else {
          // Last resort: try to find any JSON-like structure
          const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            try {
              const obj = JSON.parse(jsonObjectMatch[0]);
              const arrays = Object.values(obj).filter(v => Array.isArray(v));
              if (arrays.length > 0) {
                topics = arrays[0];
                console.log(`✅ Extracted array from object (${topics.length} items)`);
              } else {
                throw new Error('No array found in extracted object');
              }
            } catch (objError) {
              throw new Error(`Could not parse JSON from response: ${parseError.message}`);
            }
          } else {
            throw new Error(`Could not parse JSON from response: ${parseError.message}`);
          }
        }
      }

      // Validate and clean topics
      const validTopics = [];
      const seenSlugs = new Set();
      const seenKeywords = new Set();

      for (const topic of topics) {
        if (!topic.keyword || !topic.suggestedSlug) continue;

        const slug = slugify(topic.suggestedSlug || topic.keyword);
        const keywordLower = topic.keyword.toLowerCase().trim();
        
        // Skip if:
        // 1. Slug already exists in pages
        // 2. Slug already exists in cluster topics
        // 3. Keyword already exists in cluster topics
        // 4. Duplicate in current batch
        if (existingSlugs.has(slug) || 
            existingTopicSlugs.has(slug) ||
            existingTopicKeywords.has(keywordLower) ||
            seenSlugs.has(slug) ||
            seenKeywords.has(keywordLower)) {
          continue;
        }

        // Validate categoryKey matches
        if (topic.categoryKey !== cluster.categoryKey) {
          topic.categoryKey = cluster.categoryKey;
        }

        // Validate intent
        if (!['informational', 'commercial', 'lead'].includes(topic.intent)) {
          topic.intent = 'informational';
        }

        validTopics.push({
          keyword: topic.keyword.trim(),
          intent: topic.intent,
          suggestedSlug: slug,
          status: 'planned',
          pageId: null,
          createdAt: new Date()
        });

        seenSlugs.add(slug);
        seenKeywords.add(keywordLower);
        existingSlugs.add(slug); // Track in this batch too

        if (validTopics.length >= 40) break;
      }

      if (validTopics.length === 0) {
        throw new Error('No valid topics generated');
      }

      // Update cluster: append if append=true, otherwise replace
      if (append && cluster.supportingTopics && cluster.supportingTopics.length > 0) {
        cluster.supportingTopics = [...cluster.supportingTopics, ...validTopics];
        console.log(`✅ Appended ${validTopics.length} new topics to existing ${cluster.supportingTopics.length - validTopics.length} topics`);
      } else {
        cluster.supportingTopics = validTopics;
        console.log(`✅ Generated ${validTopics.length} supporting topics for pillar: "${cluster.pillarKeyword}"`);
      }
      
      cluster.updatedAt = new Date();
      await cluster.save();

      return validTopics;
    } catch (error) {
      console.error('Error generating supporting topics:', error.message);
      
      // Fallback: generate basic topics
      const fallbackTopics = [];
      let partNumber = 1;
      const maxParts = append ? 40 : 20; // Generate more if appending
      
      while (fallbackTopics.length < maxParts && partNumber <= 100) {
        const slug = slugify(`${cluster.pillarKeyword} guide part ${partNumber}`);
        const keyword = `${cluster.pillarKeyword} Guide Part ${partNumber}`;
        const keywordLower = keyword.toLowerCase();
        
        // Check against all existing sources
        if (!existingSlugs.has(slug) && 
            !existingTopicSlugs.has(slug) &&
            !existingTopicKeywords.has(keywordLower)) {
          fallbackTopics.push({
            keyword,
            intent: 'informational',
            suggestedSlug: slug,
            status: 'planned',
            pageId: null,
            createdAt: new Date()
          });
        }
        partNumber++;
      }

      if (fallbackTopics.length > 0) {
        if (append && cluster.supportingTopics && cluster.supportingTopics.length > 0) {
          cluster.supportingTopics = [...cluster.supportingTopics, ...fallbackTopics];
          console.log(`⚠️  Appended ${fallbackTopics.length} fallback topics to existing topics`);
        } else {
          cluster.supportingTopics = fallbackTopics;
          console.log(`⚠️  Generated ${fallbackTopics.length} fallback topics`);
        }
        cluster.updatedAt = new Date();
        await cluster.save();
      }

      throw error;
    }
  }

  /**
   * Get next N planned topics
   * Filters out topics that already have existing pages
   */
  static async getNextPlannedTopics(tenantId, count = 2) {
    const cluster = await this.getOrCreateCluster(tenantId);
    
    // Get existing pages to check for duplicates
    const existingPages = await PageService.getAllPagesForTenant(tenantId);
    const existingSlugs = new Set(existingPages.map(p => p.slug));
    
    // Filter topics that:
    // 1. Are still planned (not created/skipped)
    // 2. Don't have an existing page by slug
    // 3. Don't already have a pageId assigned
    const planned = cluster.supportingTopics
      .filter(t => {
        if (t.status !== 'planned') return false;
        if (t.pageId) return false; // Already has a page assigned
        if (t.suggestedSlug && existingSlugs.has(t.suggestedSlug)) return false; // Page already exists
        return true;
      })
      .slice(0, count);

    return planned;
  }

  /**
   * Mark topic as created
   */
  static async markTopicCreated(tenantId, topicKeyword, pageId) {
    const cluster = await this.getOrCreateCluster(tenantId);
    
    const topic = cluster.supportingTopics.find(
      t => t.keyword === topicKeyword || t.suggestedSlug === slugify(topicKeyword)
    );

    if (topic) {
      topic.status = 'created';
      topic.pageId = pageId;
      cluster.updatedAt = new Date();
      await cluster.save();
      return true;
    }

    return false;
  }

  /**
   * Get cluster statistics
   */
  static async getClusterStats(tenantId) {
    const cluster = await this.getOrCreateCluster(tenantId);
    
    const stats = {
      total: cluster.supportingTopics?.length || 0,
      planned: cluster.supportingTopics?.filter(t => t.status === 'planned').length || 0,
      created: cluster.supportingTopics?.filter(t => t.status === 'created').length || 0,
      skipped: cluster.supportingTopics?.filter(t => t.status === 'skipped').length || 0
    };

    return stats;
  }
}

