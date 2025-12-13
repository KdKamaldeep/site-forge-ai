import { InternalLinkingService as LinkerUtil } from '../utils/internalLinker.js';
import { PageService } from './PageService.js';
import { ClusterService } from './ClusterService.js';
import { TenantService } from './TenantService.js';

export class InternalLinkingService {
  /**
   * Build link graph for a tenant (cluster-aware)
   */
  static async buildLinkGraph(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    const allPages = await PageService.getAllPagesForTenant(tenantId);
    
    // Get current cluster (using new activePillar structure)
    let cluster = null;
    try {
      cluster = await ClusterService.getOrCreateCluster(tenantId);
    } catch (error) {
      console.warn('Could not get cluster for link graph:', error.message);
    }

    const recommendations = [];

    // Pillar -> Supporting links
    if (cluster && tenant.activePillar && tenant.activePillar.pillarKeyword) {
      const pillarKeyword = tenant.activePillar.pillarKeyword.toLowerCase();
      const pillarPage = allPages.find(p => 
        p.title.toLowerCase().includes(pillarKeyword) ||
        p.slug.toLowerCase().includes(pillarKeyword.toLowerCase().replace(/\s+/g, '-'))
      );

      if (pillarPage) {
        // Supporting pages should link to pillar
        const supportingPages = allPages.filter(p => {
          if (p._id.toString() === pillarPage._id.toString()) return false;
          return cluster.supportingTopics && cluster.supportingTopics.some(st => 
            st.pageId && st.pageId.toString() === p._id.toString()
          );
        });

        supportingPages.forEach(supporting => {
          recommendations.push({
            fromPageId: supporting._id,
            toPageId: pillarPage._id,
            anchor: tenant.activePillar.pillarKeyword,
            type: 'supporting-to-pillar',
            priority: 1
          });
        });

        // Pillar should link to newest supporting pages
        const newestSupporting = supportingPages
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 5);

        newestSupporting.forEach(supporting => {
          recommendations.push({
            fromPageId: pillarPage._id,
            toPageId: supporting._id,
            anchor: supporting.title,
            type: 'pillar-to-supporting',
            priority: 1
          });
        });
      }
    }

    // Supporting -> Supporting links (shared terms)
    allPages.forEach(page => {
      const pageKeywords = LinkerUtil.extractKeywords(
        `${page.title} ${page.content}`
      );

      const relatedPages = allPages
        .filter(p => p._id.toString() !== page._id.toString())
        .map(p => {
          const pKeywords = LinkerUtil.extractKeywords(
            `${p.title} ${p.content}`
          );
          const overlap = pageKeywords.filter(k => pKeywords.includes(k)).length;
          return { page: p, overlap };
        })
        .filter(r => r.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 2)
        .map(r => r.page);

      relatedPages.forEach(related => {
        // Find best anchor (shared keyword)
        const sharedKeywords = pageKeywords.filter(k => {
          const relatedText = `${related.title} ${related.content}`.toLowerCase();
          return relatedText.includes(k);
        });

        if (sharedKeywords.length > 0) {
          recommendations.push({
            fromPageId: page._id,
            toPageId: related._id,
            anchor: sharedKeywords[0],
            type: 'supporting-to-supporting',
            priority: 2
          });
        }
      });
    });

    return recommendations;
  }

  /**
   * Apply internal links to a page based on recommendations
   */
  static async applyInternalLinks(page, recommendations, allPages, maxLinks = 5) {
    if (!recommendations || recommendations.length === 0) {
      return page.content;
    }

    // Get recommendations for this specific page
    const pageRecommendations = recommendations
      .filter(r => r.fromPageId && r.fromPageId.toString() === page._id.toString())
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxLinks);

    if (pageRecommendations.length === 0) {
      return page.content;
    }

    let updatedContent = page.content;
    const usedAnchors = new Set();

    // Create page map for slug resolution
    const pageMap = new Map(allPages.map(p => [p._id.toString(), p]));

    for (const rec of pageRecommendations) {
      const targetPage = pageMap.get(rec.toPageId.toString());
      if (!targetPage) continue;

      const anchor = rec.anchor;
      if (usedAnchors.has(anchor.toLowerCase())) continue;

      // Find anchor in content (not in headings, not already linked)
      const anchorEscaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${anchorEscaped}\\b`, 'gi');
      
      // Simple approach: replace first occurrence that's not in a tag
      const match = regex.exec(updatedContent);
      if (match) {
        const matchIndex = match.index;
        const beforeMatch = updatedContent.substring(0, matchIndex);
        const afterMatch = updatedContent.substring(matchIndex + match[0].length);
        
        // Check if it's in a heading or already a link
        const beforeContext = beforeMatch.substring(Math.max(0, beforeMatch.length - 200));
        const isInHeading = /<h[1-6][^>]*>.*$/i.test(beforeContext);
        const isInLink = /<a[^>]*>.*$/i.test(beforeContext) && !beforeContext.includes('</a>');
        
        if (!isInHeading && !isInLink) {
          const link = `<a href="/${targetPage.slug}" class="internal-link">${match[0]}</a>`;
          updatedContent = beforeMatch + link + afterMatch;
          usedAnchors.add(anchor.toLowerCase());
        }
      }
    }

    return updatedContent;
  }

  /**
   * Build internal links for a page (enhanced with cluster awareness)
   */
  static async buildInternalLinks(pageId, tenantId) {
    const currentPage = await PageService.getPageById(pageId);
    if (!currentPage) {
      throw new Error('Page not found');
    }

    // Get all pages for link resolution
    const allPages = await PageService.getAllPagesForTenant(tenantId);

    // Build link graph
    const recommendations = await this.buildLinkGraph(tenantId);

    // Apply links to this page
    const updatedContent = await this.applyInternalLinks(
      currentPage,
      recommendations,
      allPages,
      5
    );

    // Update page with linked content
    return await PageService.updatePage(pageId, {
      content: updatedContent
    });
  }

  /**
   * Refresh internal links for all pages in a tenant
   */
  static async refreshAllLinks(tenantId) {
    const pages = await PageService.getAllPagesForTenant(tenantId);
    const results = [];

    for (const page of pages) {
      try {
        const updated = await this.buildInternalLinks(page._id, tenantId);
        results.push({ pageId: page._id, success: true, updated });
      } catch (error) {
        results.push({ pageId: page._id, success: false, error: error.message });
      }
    }

    return results;
  }
}

