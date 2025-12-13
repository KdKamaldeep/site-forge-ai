import KeywordCluster from '../models/KeywordCluster.js';
import { TenantService } from './TenantService.js';
import { PageService } from './PageService.js';
import { generateText } from './AIProviderService.js';

export class KeywordClusterService {
  /**
   * Get or create current cluster for tenant
   */
  static async getCurrentCluster(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // If tenant has no current pillar, create one
    if (!tenant.currentPillar || !tenant.currentPillar.keyword) {
      await this.initializePillar(tenantId);
      // Reload tenant
      const updatedTenant = await TenantService.getTenantById(tenantId);
      return await this.getCurrentCluster(tenantId);
    }

    const pillarKeyword = tenant.currentPillar.keyword;
    
    // Find or create cluster
    let cluster = await KeywordCluster.findOne({
      tenantId,
      pillarKeyword
    });

    if (!cluster) {
      cluster = await KeywordCluster.create({
        tenantId,
        pillarKeyword,
        supportingKeywords: []
      });
    }

    return cluster;
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

    // Create cluster
    await KeywordCluster.create({
      tenantId,
      pillarKeyword,
      supportingKeywords: []
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

    // Filter out duplicates
    const existingKeywords = cluster.supportingKeywords.map(k => k.keyword.toLowerCase());
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
      status: 'planned'
    }));

    cluster.supportingKeywords.push(...newKeywords);
    await cluster.save();

    return newKeywords;
  }

  /**
   * Mark a supporting keyword as created
   */
  static async markKeywordCreated(tenantId, keyword, pageId) {
    const cluster = await this.getCurrentCluster(tenantId);
    const keywordEntry = cluster.supportingKeywords.find(
      k => k.keyword.toLowerCase() === keyword.toLowerCase()
    );

    if (keywordEntry) {
      keywordEntry.status = 'created';
      keywordEntry.pageId = pageId;
      await cluster.save();
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
    return cluster.supportingKeywords
      .filter(k => k.status === 'planned')
      .slice(0, limit)
      .map(k => k.keyword);
  }
}

