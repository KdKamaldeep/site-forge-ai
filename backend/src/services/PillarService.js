/**
 * PillarService
 * Manages pillar lifecycle: selection, initialization, completion
 */

import { TenantService } from './TenantService.js';
import { generateText } from './AIProviderService.js';

export class PillarService {
  /**
   * Get active pillar for tenant
   */
  static async getActivePillar(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant.activePillar?.pillarKeyword ? tenant.activePillar : null;
  }

  /**
   * Initialize a new pillar if tenant has none
   * Returns the initialized pillar
   */
  static async initializePillarIfNeeded(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // If already has active pillar, return it
    if (tenant.activePillar?.pillarKeyword) {
      return tenant.activePillar;
    }

    // Get allowed categories from Site DNA
    const allowedCategories = tenant.contentPillars || [];
    if (allowedCategories.length === 0) {
      throw new Error('No content pillars defined in Site DNA. Please configure categories first.');
    }

    // Generate 3 pillar candidates
    const candidates = await this.generatePillarCandidates(tenant, allowedCategories);

    // Select best one (evergreen + practical)
    const selected = this.selectBestPillar(candidates);

    // Validate selected pillar has required fields
    if (!selected || !selected.categoryKey || !selected.keyword) {
      throw new Error('Failed to generate valid pillar candidate');
    }

    // Set as active pillar
    const targetSupportingCount = selected.category?.postingRatePerWeek 
      ? Math.max(30, selected.category.postingRatePerWeek * 10) 
      : 30;

    tenant.activePillar = {
      categoryKey: selected.categoryKey,
      pillarKeyword: selected.keyword,
      targetSupportingCount,
      createdAt: new Date(),
      completedAt: null
    };

    await tenant.save();

    console.log(`✅ Initialized new pillar: "${selected.keyword}" (category: ${selected.categoryKey}, target: ${targetSupportingCount} pages)`);
    return tenant.activePillar;
  }

  /**
   * Generate 3 pillar candidates using AI
   */
  static async generatePillarCandidates(tenant, allowedCategories) {
    const brandName = tenant.brandIdentity?.brandName || tenant.name;
    const tone = tenant.brandIdentity?.tone || 'friendly';
    const forbiddenTopics = tenant.compliance?.forbiddenTopics || [];

    const categoriesList = allowedCategories.map(c => `- ${c.categoryKey}: ${c.description}`).join('\n');

    const prompt = `You are an SEO expert. For a website called "${brandName}" (domain: ${tenant.domain}), propose 3 pillar keyword candidates.

REQUIREMENTS:
- Each pillar must be from one of these allowed categories:
${categoriesList}

- Each pillar keyword should be:
  * Broad enough to support 20-40 supporting articles
  * Evergreen (not time-sensitive)
  * High search volume potential
  * Clear informational/commercial intent
  * Aligned with the brand's ${tone} tone

${forbiddenTopics.length > 0 ? `- NEVER use these forbidden topics: ${forbiddenTopics.join(', ')}` : ''}

Return JSON with format:
{
  "candidates": [
    {
      "keyword": "pillar keyword phrase",
      "categoryKey": "must match one of the allowed categoryKeys",
      "searchIntent": "informational|commercial|lead",
      "reasoning": "why this is a good pillar (evergreen + practical)"
    }
  ]
}`;

    try {
      const content = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are an SEO expert specializing in pillar content strategy. Return valid JSON only.',
        temperature: 0.7,
        maxTokens: 600,
        jsonMode: true
      });

      let parsed = JSON.parse(content);

      if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
        throw new Error('Invalid response format');
      }

      // Validate categoryKeys
      const validCategoryKeys = allowedCategories.map(c => c.categoryKey);
      const candidates = parsed.candidates
        .filter(c => validCategoryKeys.includes(c.categoryKey))
        .slice(0, 3);

      if (candidates.length === 0) {
        throw new Error('No valid candidates with matching categoryKeys');
      }

      // Attach category info
      return candidates.map(c => ({
        ...c,
        category: allowedCategories.find(cat => cat.categoryKey === c.categoryKey)
      }));
    } catch (error) {
      console.error('Error generating pillar candidates:', error.message);
      // Fallback: use first category's description as pillar
      const fallbackCategory = allowedCategories[0];
      return [{
        keyword: `${fallbackCategory.description} Guide`,
        categoryKey: fallbackCategory.categoryKey,
        searchIntent: 'informational',
        reasoning: 'Fallback pillar based on first category',
        category: fallbackCategory
      }];
    }
  }

  /**
   * Select best pillar from candidates (evergreen + practical)
   */
  static selectBestPillar(candidates) {
    // Score each candidate
    const scored = candidates.map(c => {
      let score = 0;
      
      // Prefer informational intent (more evergreen)
      if (c.searchIntent === 'informational') score += 3;
      else if (c.searchIntent === 'commercial') score += 1;
      
      // Prefer keywords with "guide", "complete", "ultimate" (evergreen signals)
      const keywordLower = c.keyword.toLowerCase();
      if (keywordLower.includes('guide') || keywordLower.includes('complete') || keywordLower.includes('ultimate')) {
        score += 2;
      }
      
      // Prefer categories with higher posting rate
      if (c.category?.postingRatePerWeek) {
        score += c.category.postingRatePerWeek;
      }
      
      return { ...c, score };
    });

    // Return highest scored
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  /**
   * Check if pillar is complete
   */
  static async isPillarComplete(tenantId, cluster) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant || !tenant.activePillar) {
      return false;
    }

    const activePillar = tenant.activePillar;
    const createdCount = cluster.supportingTopics?.filter(t => t.status === 'created').length || 0;
    const plannedCount = cluster.supportingTopics?.filter(t => t.status === 'planned').length || 0;

    // Complete if: created >= target OR no remaining planned topics
    return createdCount >= activePillar.targetSupportingCount || plannedCount === 0;
  }

  /**
   * Complete current pillar and select next one
   */
  static async completePillarAndSelectNext(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant || !tenant.activePillar) {
      throw new Error('No active pillar to complete');
    }

    const activePillar = tenant.activePillar;

    // Validate activePillar has required fields before moving to history
    const hasValidPillar = activePillar.categoryKey && 
                          activePillar.pillarKeyword && 
                          activePillar.createdAt;

    // Move to history only if pillar is valid
    if (hasValidPillar) {
      if (!tenant.pillarHistoryNew) {
        tenant.pillarHistoryNew = [];
      }

      tenant.pillarHistoryNew.push({
        categoryKey: activePillar.categoryKey,
        pillarKeyword: activePillar.pillarKeyword,
        targetSupportingCount: activePillar.targetSupportingCount || 30,
        createdAt: activePillar.createdAt,
        completedAt: new Date()
      });

      console.log(`✅ Completed pillar: "${activePillar.pillarKeyword}" (moved to history)`);
    } else {
      console.warn(`⚠️  Active pillar is incomplete (categoryKey: ${activePillar.categoryKey}, pillarKeyword: ${activePillar.pillarKeyword}), skipping history entry`);
    }

    // Select next pillar
    const allowedCategories = tenant.contentPillars || [];
    if (allowedCategories.length === 0) {
      throw new Error('No content pillars available for next pillar');
    }

    // Find categories that haven't been used recently
    const usedCategoryKeys = tenant.pillarHistoryNew.map(h => h.categoryKey);
    const availableCategories = allowedCategories.filter(c => 
      !usedCategoryKeys.includes(c.categoryKey) || 
      usedCategoryKeys.filter(k => k === c.categoryKey).length < 2 // Allow reuse after 2 cycles
    );

    const nextCategory = availableCategories.length > 0 
      ? availableCategories[0] // Simple: pick first available
      : allowedCategories[0]; // Fallback to first

    // Generate candidates for next category
    const candidates = await this.generatePillarCandidates(tenant, [nextCategory]);
    const selected = this.selectBestPillar(candidates);

    // Validate selected pillar has required fields
    if (!selected || !selected.categoryKey || !selected.keyword) {
      throw new Error('Failed to generate valid pillar candidate for next pillar');
    }

    const targetSupportingCount = nextCategory.postingRatePerWeek 
      ? Math.max(30, nextCategory.postingRatePerWeek * 10) 
      : 30;

    tenant.activePillar = {
      categoryKey: selected.categoryKey,
      pillarKeyword: selected.keyword,
      targetSupportingCount,
      createdAt: new Date(),
      completedAt: null
    };

    await tenant.save();

    console.log(`✨ Selected next pillar: "${selected.keyword}" (category: ${selected.categoryKey}, target: ${targetSupportingCount} pages)`);
    return tenant.activePillar;
  }
}

