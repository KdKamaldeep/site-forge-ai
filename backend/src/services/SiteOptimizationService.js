import PageVersion from '../models/PageVersion.js';
import PageSearchMetricsWeekly from '../models/PageSearchMetricsWeekly.js';
import { PageService } from './PageService.js';
import { TenantService } from './TenantService.js';
import { MonetizationTemplateService } from './MonetizationTemplateService.js';
import { generateText } from './AIProviderService.js';

export class SiteOptimizationService {
  /**
   * Run weekly optimization for a tenant
   */
  static async optimizeTenant(tenantId, autoPublish = false) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const results = {
      pagesOptimized: 0,
      titlesRewritten: 0,
      contentExpanded: 0,
      internalLinksAdded: 0,
      errors: []
    };

    // Get pages with metrics from last 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const metrics = await PageSearchMetricsWeekly.find({
      tenantId,
      weekStartDate: { $gte: cutoffDate }
    }).populate('pageId');

    // Group by page
    const pageMetricsMap = new Map();
    metrics.forEach(metric => {
      const pageId = metric.pageId?._id?.toString() || metric.pageId?.toString();
      if (!pageId) return;

      if (!pageMetricsMap.has(pageId)) {
        pageMetricsMap.set(pageId, {
          pageId,
          impressions: 0,
          clicks: 0,
          totalPosition: 0,
          positionCount: 0,
          weeks: []
        });
      }

      const pageData = pageMetricsMap.get(pageId);
      pageData.impressions += metric.impressions || 0;
      pageData.clicks += metric.clicks || 0;
      if (metric.avgPosition) {
        pageData.totalPosition += metric.avgPosition;
        pageData.positionCount += 1;
      }
      pageData.weeks.push(metric);
    });

    // Process each page
    for (const [pageId, pageData] of pageMetricsMap) {
      try {
        const page = await PageService.getPageById(pageId);
        if (!page) continue;

        const avgPosition = pageData.positionCount > 0 
          ? pageData.totalPosition / pageData.positionCount 
          : null;
        const ctr = pageData.impressions > 0 
          ? (pageData.clicks / pageData.impressions) * 100 
          : 0;

        // Rule 1: Low CTR optimization
        if (pageData.impressions > 500 && ctr < 1.5) {
          const optimized = await this.optimizeCTR(page, tenantId);
          if (optimized) {
            await this.saveVersion(page, optimized, 'ctr_improvement', 
              `Low CTR (${ctr.toFixed(2)}%) - Rewrote title and meta description`, autoPublish);
            results.titlesRewritten += 1;
            results.pagesOptimized += 1;
          }
        }

        // Rule 2: Content expansion for pages in positions 8-15
        if (avgPosition && avgPosition >= 8 && avgPosition <= 15) {
          const expanded = await this.expandContent(page, tenantId);
          if (expanded) {
            await this.saveVersion(page, expanded, 'content_expansion',
              `Average position ${avgPosition.toFixed(1)} - Expanded content with FAQ and subsections`, autoPublish);
            results.contentExpanded += 1;
            results.pagesOptimized += 1;
          }
        }

        // Rule 3: Internal links (always check)
        const linked = await this.addInternalLinks(page, tenantId);
        if (linked) {
          await this.saveVersion(page, linked, 'internal_links',
            'Added internal links to improve SEO', autoPublish);
          results.internalLinksAdded += 1;
        }

      } catch (error) {
        console.error(`Error optimizing page ${pageId}:`, error.message);
        results.errors.push({ pageId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Optimize CTR by rewriting title and meta description
   */
  static async optimizeCTR(page, tenantId) {
    const prompt = `Rewrite the title and meta description for this page to improve click-through rate (CTR) in search results.

Current Title: ${page.title}
Current Meta Description: ${page.meta?.description || 'None'}

Page Content (first 500 chars): ${page.content.substring(0, 500)}

Requirements:
- Title: 50-60 characters, compelling, includes primary keyword
- Meta Description: 150-160 characters, action-oriented, includes call-to-action
- Do NOT change the page intent or main topic
- Make it more click-worthy while staying accurate

Return JSON:
{
  "title": "new title",
  "metaDescription": "new meta description",
  "reason": "why this will improve CTR"
}`;

    try {
      const content = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are an SEO expert specializing in CTR optimization. Return valid JSON only.',
        temperature: 0.7,
        maxTokens: 300,
        jsonMode: true
      });

      const parsed = JSON.parse(content);

      return {
        title: parsed.title || page.title,
        meta: {
          ...page.meta,
          title: parsed.title || page.meta?.title || page.title,
          description: parsed.metaDescription || page.meta?.description
        },
        content: page.content // Don't change content
      };
    } catch (error) {
      console.error('Error optimizing CTR:', error);
      return null;
    }
  }

  /**
   * Expand content with FAQ and subsections
   */
  static async expandContent(page, tenantId) {
    const prompt = `Expand this page content by adding:
1. An FAQ section with 5-7 questions and answers (with FAQ schema)
2. 2 new subsections (H2 headings) with detailed content
3. Better internal linking opportunities

Current Content: ${page.content.substring(0, 2000)}

Requirements:
- Keep existing content intact
- Add FAQ section at the end (before conclusion if exists)
- Add 2 new H2 sections with 200-300 words each
- Use proper HTML structure
- Do NOT change the page intent

Return the FULL expanded HTML content (including original + additions).`;

    try {
      const expandedContent = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are an SEO content expert. Expand content while maintaining quality and intent.',
        temperature: 0.7,
        maxTokens: 2000
      });

      return {
        title: page.title,
        meta: page.meta,
        content: expandedContent
      };
    } catch (error) {
      console.error('Error expanding content:', error);
      return null;
    }
  }

  /**
   * Add internal links to page
   */
  static async addInternalLinks(page, tenantId) {
    // Use InternalLinkingService to add links
    const { InternalLinkingService } = await import('./InternalLinkingService.js');
    
    try {
      const updated = await InternalLinkingService.buildInternalLinks(page._id, tenantId);
      if (updated && updated.content !== page.content) {
        return {
          title: page.title,
          meta: page.meta,
          content: updated.content
        };
      }
    } catch (error) {
      console.error('Error adding internal links:', error);
    }

    return null;
  }

  /**
   * Save page version
   */
  static async saveVersion(page, optimized, optimizationType, aiReason, autoPublish = false) {
    // Get latest version number
    const latestVersion = await PageVersion.findOne(
      { tenantId: page.tenantId, pageId: page._id },
      { version: 1 }
    ).sort({ version: -1 });

    const nextVersion = (latestVersion?.version || 0) + 1;

    const version = await PageVersion.create({
      tenantId: page.tenantId,
      pageId: page._id,
      version: nextVersion,
      title: optimized.title,
      meta: optimized.meta,
      html: optimized.content,
      content: optimized.content,
      aiReason,
      status: autoPublish ? 'published' : 'draft',
      optimizationType
    });

    // If auto-publish, update the page
    if (autoPublish) {
      await PageService.updatePage(page._id, {
        title: optimized.title,
        meta: optimized.meta,
        content: optimized.content
      });
    }

    return version;
  }

  /**
   * Rollback to a specific version
   */
  static async rollbackToVersion(pageId, versionNumber) {
    const version = await PageVersion.findOne({
      pageId,
      version: versionNumber
    });

    if (!version) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    // Update page
    await PageService.updatePage(pageId, {
      title: version.title,
      meta: version.meta,
      content: version.content
    });

    // Mark version as rolled back
    version.status = 'rolled_back';
    await version.save();

    return version;
  }

  /**
   * Detect keyword cannibalization
   */
  static async detectCannibalization(tenantId) {
    // Get all metrics and find pages targeting same queries
    const metrics = await PageSearchMetricsWeekly.find({ tenantId })
      .populate('pageId')
      .sort({ weekStartDate: -1 })
      .limit(1000);

    const queryMap = new Map();

    metrics.forEach(metric => {
      if (!metric.topQueries || !metric.pageId) return;

      metric.topQueries.forEach(query => {
        const q = query.query.toLowerCase();
        if (!queryMap.has(q)) {
          queryMap.set(q, []);
        }
        queryMap.get(q).push({
          pageId: metric.pageId._id || metric.pageId,
          pageSlug: metric.pageSlug,
          impressions: query.impressions,
          clicks: query.clicks,
          avgPosition: query.avgPosition
        });
      });
    });

    // Find queries with multiple pages
    const cannibalization = [];
    queryMap.forEach((pages, query) => {
      if (pages.length > 1) {
        // Multiple pages targeting same query
        const uniquePages = [...new Set(pages.map(p => p.pageId.toString()))];
        if (uniquePages.length > 1) {
          cannibalization.push({
            query,
            pages: uniquePages.map(pageId => {
              const pageData = pages.find(p => p.pageId.toString() === pageId);
              return {
                pageId,
                pageSlug: pageData?.pageSlug,
                impressions: pageData?.impressions || 0,
                clicks: pageData?.clicks || 0,
                avgPosition: pageData?.avgPosition
              };
            })
          });
        }
      }
    });

    return cannibalization;
  }
}

