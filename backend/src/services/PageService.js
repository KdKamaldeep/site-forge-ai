import Page from '../models/Page.js';

export class PageService {
  /**
   * Create a new page
   */
  static async createPage(data) {
    const page = new Page(data);
    return await page.save();
  }

  /**
   * Get page by ID
   */
  static async getPageById(id) {
    return await Page.findById(id).populate('tenantId');
  }

  /**
   * Get page by tenant and slug (for Next.js SSR)
   * Returns formatted response with meta, uxLayout, content
   * @param {boolean} includeUnpublished - If true, returns page even if unpublished (for preview)
   */
  static async getPageBySlug(tenantId, slug, includeUnpublished = false) {
    const query = { 
      tenantId, 
      slug: slug.toLowerCase().trim() 
    };
    
    // Only return published pages unless includeUnpublished is true
    // For backward compatibility: treat missing published field as true
    if (!includeUnpublished) {
      query.$or = [
        { published: true },
        { published: { $exists: false } }
      ];
    }
    
    const page = await Page.findOne(query).select('_id title slug meta content uxLayout schemaMarkup readingTime wordCount intent monetizationMode categoryKey primaryKeyword thumbnail updatedAt createdAt publishedAt isStandalone standalonePageType published');
    
    if (!page) {
      return null;
    }

    return {
      _id: page._id,
      id: page._id.toString(), // Also include as string for convenience
      title: page.title,
      slug: page.slug,
      published: page.published !== undefined ? page.published : true, // Include published status
      meta: {
        title: page.meta?.title || page.title,
        description: page.meta?.description || '',
        keywords: page.meta?.keywords || [],
        ogImage: page.meta?.ogImage || null,
        author: page.meta?.author || null,
        citations: page.meta?.citations || []
      },
      content: page.content,
      uxLayout: page.uxLayout || { layout: 'StandardArticle', sections: [] },
      schemaMarkup: page.schemaMarkup || null,
      readingTime: page.readingTime || null,
      wordCount: page.wordCount || null,
      intent: page.intent || 'informational',
      monetizationMode: page.monetizationMode || 'adsense',
      categoryKey: page.categoryKey || null,
      primaryKeyword: page.primaryKeyword || null,
      thumbnail: page.thumbnail || null,
      isStandalone: page.isStandalone || false,
      standalonePageType: page.standalonePageType || null,
      updatedAt: page.updatedAt || page.createdAt || null, // Use updatedAt, fallback to createdAt
      publishedAt: page.publishedAt || page.createdAt || null // Use actual publishedAt field, fallback to createdAt for backward compatibility
    };
  }

  /**
   * Get homepage for a tenant
   * Only returns published homepage
   */
  static async getHomePage(tenantId) {
    const page = await Page.findOne({ 
      tenantId, 
      isHome: true,
      $or: [
        { published: true },
        { published: { $exists: false } }
      ]
    }).select('title slug meta content uxLayout schemaMarkup readingTime wordCount thumbnail updatedAt createdAt publishedAt');
    
    if (!page) {
      return null;
    }

    return {
      title: page.title,
      slug: page.slug,
      meta: {
        title: page.meta?.title || page.title,
        description: page.meta?.description || '',
        keywords: page.meta?.keywords || [],
        ogImage: page.meta?.ogImage || null,
        author: page.meta?.author || null,
        citations: page.meta?.citations || []
      },
      isStandalone: page.isStandalone || false,
      content: page.content,
      uxLayout: page.uxLayout || { layout: 'StandardArticle', sections: [] },
      schemaMarkup: page.schemaMarkup || null,
      readingTime: page.readingTime || null,
      wordCount: page.wordCount || null,
      thumbnail: page.thumbnail || null,
      updatedAt: page.updatedAt || page.createdAt || null, // Use updatedAt, fallback to createdAt
      publishedAt: page.publishedAt || page.createdAt || null // Use actual publishedAt field, fallback to createdAt for backward compatibility
    };
  }

  /**
   * List all pages for a tenant (for sitemap/menus)
   * Returns pages with essential fields for listing, sorted by updatedAt (newest first)
   * Excludes standalone pages (they appear only in footer)
   * Only returns published pages
   */
  static async listPagesForTenant(tenantId) {
    // Exclude standalone pages and unpublished pages from regular listings
    // For backward compatibility: treat missing published field as true
    const pages = await Page.find({ 
      tenantId,
      isStandalone: { $ne: true }, // Exclude standalone pages
      $or: [
        { published: true },
        { published: { $exists: false } }
      ]
    })
      .select('_id slug title meta categoryKey readingTime wordCount thumbnail updatedAt publishedAt createdAt isStandalone isHome')
      .sort({ updatedAt: -1 }); // Newest first
    
    return {
      pages: pages
        .filter(page => !page.isStandalone) // Double-check: exclude standalone pages
        .map(page => ({
          _id: page._id,
          slug: page.slug,
          title: page.title,
          meta: {
            description: page.meta?.description || null
          },
          categoryKey: page.categoryKey || null,
          readingTime: page.readingTime || null,
          wordCount: page.wordCount || null,
          thumbnail: page.thumbnail || null,
          updatedAt: page.updatedAt,
          publishedAt: page.publishedAt || page.createdAt || null, // Use actual publishedAt field, fallback to createdAt
          isStandalone: page.isStandalone || false, // Include for frontend filtering
          isHome: page.isHome || false // Include for sitemap generation
        }))
    };
  }

  /**
   * Update page
   */
  static async updatePage(id, updates) {
    // Prevent updatedAt from updating when only publishing (preserves original update date)
    // Check if this is just a publish operation (only updating published field)
    const isPublishOnly = Object.keys(updates).length === 1 && updates.published !== undefined;
    
    if (isPublishOnly) {
      // Publishing only - preserve existing updatedAt and set publishedAt
      const existingPage = await Page.findById(id).select('updatedAt publishedAt');
      const originalUpdatedAt = existingPage?.updatedAt;
      
      // Set publishedAt when publishing (only if not already set, or update if republishing)
      const publishUpdates = {
        ...updates,
        publishedAt: updates.published ? (existingPage?.publishedAt || new Date()) : null
      };
      
      const updatedPage = await Page.findByIdAndUpdate(
        id,
        { $set: publishUpdates },
        { new: true }
      ).populate('tenantId');
      
      // Restore original updatedAt if it was changed
      if (originalUpdatedAt && updatedPage.updatedAt?.getTime() !== originalUpdatedAt.getTime()) {
        await Page.updateOne(
          { _id: id },
          { $set: { updatedAt: originalUpdatedAt } }
        );
        updatedPage.updatedAt = originalUpdatedAt;
      }
      
      return updatedPage;
    } else {
      // Normal update (content changes) - let MongoDB timestamps handle updatedAt
      return await Page.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).populate('tenantId');
    }
  }

  /**
   * List pages for a tenant
   * Excludes standalone pages (they only appear in standalone API and slug lookups)
   * Only returns published pages
   */
  static async listPages(tenantId) {
    // For backward compatibility: treat missing published field as true
    return await Page.find({ 
      tenantId,
      isStandalone: { $ne: true }, // Exclude standalone pages
      $or: [
        { published: true },
        { published: { $exists: false } }
      ]
    })
      .sort({ updatedAt: -1 })
      .select('-content -uxLayout -schemaMarkup')
      .populate('tenantId', 'name domain');
  }

  /**
   * Delete page
   */
  static async deletePage(id) {
    return await Page.findByIdAndDelete(id);
  }

  /**
   * Get all pages for a tenant (for sitemap/internal linking)
   * Excludes standalone pages by default
   * Only returns published pages (for sitemap/linking)
   */
  static async getAllPagesForTenant(tenantId, includeStandalone = false) {
    // For backward compatibility: treat missing published field as true
    const query = { 
      tenantId,
      $or: [
        { published: true },
        { published: { $exists: false } }
      ]
    };
    if (!includeStandalone) {
      query.isStandalone = { $ne: true }; // Exclude standalone pages
    }
    
    const pages = await Page.find(query).select('_id title slug content meta categoryKey primaryKeyword intent monetizationMode readingTime wordCount updatedAt createdAt publishedAt isStandalone standalonePageType').lean();
    
    // Map to include publishedAt (use actual field, fallback to createdAt for backward compatibility)
    return pages.map(page => ({
      ...page,
      publishedAt: page.publishedAt || page.createdAt || null // Use actual publishedAt field, fallback to createdAt
    }));
  }

  /**
   * Get standalone pages for a tenant
   * Only returns published standalone pages
   */
  static async getStandalonePages(tenantId) {
    // For backward compatibility: treat missing published field as true
    const pages = await Page.find({ 
      tenantId, 
      isStandalone: true,
      $or: [
        { published: true },
        { published: { $exists: false } }
      ]
    })
    .select('_id title slug standalonePageType updatedAt createdAt publishedAt')
    .sort({ standalonePageType: 1 }) // Sort by page type for consistent ordering
    .lean();
    
    return pages.map(page => ({
      ...page,
      publishedAt: page.publishedAt || page.createdAt || null // Use actual publishedAt field, fallback to createdAt
    }));
  }
}

