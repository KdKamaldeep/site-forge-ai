import KeywordCluster from '../models/KeywordCluster.js';
import { TenantService } from './TenantService.js';
import { PageService } from './PageService.js';
import { PillarService } from './PillarService.js';
import { generateText } from './AIProviderService.js';

export class KeywordClusterService {
  /**
   * Get or create current cluster for tenant
   * Updated to use new activePillar system with categoryKey
   */
  static async getCurrentCluster(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Use new activePillar system (preferred)
    if (tenant.activePillar && tenant.activePillar.categoryKey && tenant.activePillar.pillarKeyword) {
      const categoryKey = tenant.activePillar.categoryKey;
      const pillarKeyword = tenant.activePillar.pillarKeyword;
      
      // Find or create cluster with categoryKey
      let cluster = await KeywordCluster.findOne({
        tenantId,
        categoryKey,
        pillarKeyword
      });

      if (!cluster) {
        cluster = await KeywordCluster.create({
          tenantId,
          categoryKey,
          pillarKeyword,
          supportingTopics: []
        });
        console.log(`✅ Created new KeywordCluster for pillar: "${pillarKeyword}" (category: ${categoryKey})`);
      }

      return cluster;
    }

    // Fallback to legacy currentPillar system (for backward compatibility)
    if (tenant.currentPillar && tenant.currentPillar.keyword) {
      const pillarKeyword = tenant.currentPillar.keyword;
      
      // Try to infer categoryKey from contentPillars or use a default
      let categoryKey = 'general';
      if (tenant.contentPillars && tenant.contentPillars.length > 0) {
        // Use first category as fallback
        categoryKey = tenant.contentPillars[0].categoryKey || 'general';
      }
      
      // Find or create cluster
      let cluster = await KeywordCluster.findOne({
        tenantId,
        categoryKey,
        pillarKeyword
      });

      if (!cluster) {
        cluster = await KeywordCluster.create({
          tenantId,
          categoryKey,
          pillarKeyword,
          supportingTopics: []
        });
        console.log(`✅ Created KeywordCluster (legacy) for pillar: "${pillarKeyword}" (category: ${categoryKey})`);
      }

      return cluster;
    }

    // If no pillar exists, try to initialize using new system
    try {
      const activePillar = await PillarService.initializePillarIfNeeded(tenantId);
      if (activePillar && activePillar.categoryKey && activePillar.pillarKeyword) {
        // Retry with new active pillar
        return await this.getCurrentCluster(tenantId);
      }
    } catch (error) {
      console.warn('Failed to initialize pillar using new system:', error.message);
    }

    // Last resort: initialize legacy pillar
    await this.initializePillar(tenantId);
    const updatedTenant = await TenantService.getTenantById(tenantId);
    return await this.getCurrentCluster(tenantId);
  }

  /**
   * Initialize a new pillar for tenant (AI proposes 3, picks best)
   */
  static async initializePillar(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const niche = this.inferNiche(tenant);

    // AI proposes 3 pillar candidates
    const prompt = `You are an SEO expert. For a ${niche} website called "${tenant.name}" (domain: ${tenant.domain}), propose 3 pillar keyword candidates.

A pillar keyword should be:
- Broad enough to support 20-40 supporting articles
- Evergreen (not time-sensitive)
- High search volume potential
- Clear informational/commercial intent
- Aligned with the ${niche} niche

Return JSON with format:
{
  "candidates": [
    {
      "keyword": "keyword phrase",
      "searchIntent": "informational|commercial|lead",
      "reasoning": "why this is a good pillar"
    }
  ]
}`;

    const content = await generateText({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      systemPrompt: 'You are an SEO expert specializing in pillar content strategy. Return valid JSON only.',
      temperature: 0.7,
      maxTokens: 500,
      jsonMode: true
    });
    let candidates = [];

    try {
      const parsed = JSON.parse(content);
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        candidates = parsed.candidates;
      }
    } catch (error) {
      console.warn('Failed to parse pillar candidates, using fallback');
      // Fallback
      candidates = [
        { keyword: `${niche} guide`, searchIntent: 'informational', reasoning: 'Broad informational pillar' },
        { keyword: `best ${niche}`, searchIntent: 'commercial', reasoning: 'Commercial intent pillar' },
        { keyword: `${niche} tips`, searchIntent: 'informational', reasoning: 'Tips-based pillar' }
      ];
    }

    // Pick best candidate (prefer informational, then commercial)
    const bestCandidate = candidates
      .sort((a, b) => {
        const intentOrder = { informational: 0, commercial: 1, lead: 2 };
        return (intentOrder[a.searchIntent] || 0) - (intentOrder[b.searchIntent] || 0);
      })[0] || candidates[0];

    const pillarKeyword = bestCandidate.keyword || candidates[0]?.keyword || `${niche} guide`;

    // Update tenant with current pillar
    tenant.currentPillar = {
      keyword: pillarKeyword,
      createdAt: new Date()
    };
    await tenant.save();

    // Create cluster (legacy - try to infer categoryKey)
    let categoryKey = 'general';
    if (tenant.contentPillars && tenant.contentPillars.length > 0) {
      categoryKey = tenant.contentPillars[0].categoryKey || 'general';
    }
    
    await KeywordCluster.create({
      tenantId,
      categoryKey,
      pillarKeyword,
      supportingTopics: []
    });

    return pillarKeyword;
  }

  /**
   * Generate supporting keywords for current pillar
   */
  static async generateSupportingKeywords(tenantId, count = 5) {
    const cluster = await this.getCurrentCluster(tenantId);
    const tenant = await TenantService.getTenantById(tenantId);
    
    // Get existing pages to avoid duplicates
    const pagesList = await PageService.listPagesForTenant(tenantId);
    const existingSlugs = (pagesList.pages || []).map(p => p.slug.toLowerCase());
    const existingTitles = (pagesList.pages || []).map(p => p.title.toLowerCase());

    const niche = this.inferNiche(tenant);

    const prompt = `Generate ${count} long-tail supporting keywords for the pillar keyword "${cluster.pillarKeyword}" in the ${niche} niche.

Requirements:
- Must be long-tail (3-5 words)
- Must NOT duplicate existing pages (check these slugs: ${existingSlugs.slice(0, 10).join(', ')})
- Must NOT duplicate existing titles (check these: ${existingTitles.slice(0, 10).join(', ')})
- Must map to explicit intent: informational, commercial, or lead
- Must be specific and searchable
- Must relate to the pillar "${cluster.pillarKeyword}"

Return JSON with format:
{
  "keywords": [
    {
      "keyword": "long tail keyword phrase",
      "intent": "informational|commercial|lead",
      "suggested_slug": "url-friendly-slug",
      "page_type": "supporting"
    }
  ]
}`;

    const content = await generateText({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      systemPrompt: 'You are an SEO expert. Generate unique, long-tail supporting keywords. Return valid JSON only.',
      temperature: 0.8,
      maxTokens: 800,
      jsonMode: true
    });
    let keywords = [];

    try {
      const parsed = JSON.parse(content);
      if (parsed.keywords && Array.isArray(parsed.keywords)) {
        keywords = parsed.keywords;
      } else if (parsed.keyword && Array.isArray(parsed.keyword)) {
        keywords = parsed.keyword;
      }
    } catch (error) {
      console.warn('Failed to parse supporting keywords, using fallback');
      // Fallback - generate basic supporting keywords
      keywords = Array.from({ length: count }, (_, i) => ({
        keyword: `${cluster.pillarKeyword} ${i + 1}`,
        intent: 'informational',
        suggested_slug: `${cluster.pillarKeyword.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
        page_type: 'supporting'
      }));
    }

    // Filter out duplicates (use supportingTopics)
    const existingKeywords = (cluster.supportingTopics || []).map(k => k.keyword?.toLowerCase() || '').filter(Boolean);
    keywords = keywords.filter(k => {
      const kw = k.keyword?.toLowerCase() || '';
      return kw && 
        !existingKeywords.includes(kw) &&
        !existingSlugs.includes((k.suggested_slug || '').toLowerCase()) &&
        !existingTitles.includes(kw);
    });

    // Add to cluster as "planned"
    const newKeywords = keywords.slice(0, count).map(k => ({
      keyword: k.keyword,
      intent: k.intent || 'informational',
      suggestedSlug: k.suggested_slug || k.keyword.toLowerCase().replace(/\s+/g, '-'),
      status: 'planned',
      pageId: null,
      createdAt: new Date()
    }));

    // Use supportingTopics (new system) instead of supportingKeywords (legacy virtual)
    if (!cluster.supportingTopics) {
      cluster.supportingTopics = [];
    }
    cluster.supportingTopics.push(...newKeywords);
    cluster.updatedAt = new Date();
    await cluster.save();

    return newKeywords;
  }

  /**
   * Mark a supporting keyword as created
   * Works with both new (supportingTopics) and legacy (supportingKeywords) systems
   */
  static async markKeywordCreated(tenantId, keyword, pageId) {
    try {
      const cluster = await this.getCurrentCluster(tenantId);
      
      // Try new system first (supportingTopics)
      if (cluster.supportingTopics && cluster.supportingTopics.length > 0) {
        const topicEntry = cluster.supportingTopics.find(
          t => t.keyword && t.keyword.toLowerCase() === keyword.toLowerCase()
        );

        if (topicEntry) {
          topicEntry.status = 'created';
          topicEntry.pageId = pageId;
          cluster.updatedAt = new Date();
          await cluster.save();
          return;
        }
      }
      
      // Fallback to legacy system (supportingKeywords - virtual field)
      // Note: supportingKeywords is a virtual that maps to supportingTopics
      const keywordEntry = cluster.supportingTopics?.find(
        t => t.keyword && t.keyword.toLowerCase() === keyword.toLowerCase()
      );

      if (keywordEntry) {
        keywordEntry.status = 'created';
        keywordEntry.pageId = pageId;
        cluster.updatedAt = new Date();
        await cluster.save();
      }
    } catch (error) {
      // If cluster doesn't exist or can't be created, that's okay - just log it
      console.warn(`Could not mark keyword in cluster: ${error.message}`);
      throw error; // Re-throw so caller can handle it
    }
  }

  /**
   * Check if cluster is complete (20-40 supporting keywords created)
   */
  static async shouldRetirePillar(tenantId) {
    const cluster = await this.getCurrentCluster(tenantId);
    const createdCount = cluster.supportingKeywords.filter(k => k.status === 'created').length;
    return createdCount >= 20; // Threshold: 20 supporting pages
  }

  /**
   * Retire current pillar and start new one
   */
  static async retirePillar(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    
    if (tenant.currentPillar && tenant.currentPillar.keyword) {
      // Move to history
      if (!tenant.pillarHistory) {
        tenant.pillarHistory = [];
      }
      tenant.pillarHistory.push({
        keyword: tenant.currentPillar.keyword,
        createdAt: tenant.currentPillar.createdAt || new Date(),
        retiredAt: new Date()
      });

      // Clear current pillar
      tenant.currentPillar = null;
      await tenant.save();
    }

    // Initialize new pillar
    return await this.initializePillar(tenantId);
  }

  /**
   * Infer niche from tenant (same logic as run-agent.js)
   */
  static inferNiche(tenant) {
    const name = tenant.name?.toLowerCase() || '';
    const domain = tenant.domain?.toLowerCase() || '';
    const combined = `${name} ${domain}`;

    const niches = {
      'travel': ['travel', 'trip', 'destination', 'vacation', 'tour', 'journey'],
      'health': ['health', 'fitness', 'wellness', 'medical', 'doctor', 'medicine'],
      'tech': ['tech', 'technology', 'software', 'app', 'digital', 'ai', 'code'],
      'finance': ['finance', 'money', 'investment', 'bank', 'crypto', 'trading'],
      'food': ['food', 'recipe', 'cooking', 'restaurant', 'cuisine', 'dining'],
      'education': ['education', 'learn', 'course', 'school', 'university', 'study'],
      'business': ['business', 'company', 'enterprise', 'corporate', 'startup'],
      'lifestyle': ['lifestyle', 'life', 'living', 'home', 'family', 'personal'],
      'sports': ['sport', 'fitness', 'athletic', 'game', 'team', 'player'],
      'entertainment': ['entertainment', 'movie', 'music', 'show', 'game', 'fun']
    };

    for (const [niche, keywords] of Object.entries(niches)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return niche;
      }
    }

    return 'general';
  }

  /**
   * Get planned keywords for generation
   */
  static async getPlannedKeywords(tenantId, limit = 5) {
    const cluster = await this.getCurrentCluster(tenantId);
    return (cluster.supportingTopics || [])
      .filter(k => k.status === 'planned')
      .slice(0, limit)
      .map(k => k.keyword)
      .filter(Boolean);
  }
}

