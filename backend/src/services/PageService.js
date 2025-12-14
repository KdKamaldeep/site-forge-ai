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
   */
  static async getPageBySlug(tenantId, slug) {
    const page = await Page.findOne({ 
      tenantId, 
      slug: slug.toLowerCase().trim() 
    }).select('_id title slug meta content uxLayout schemaMarkup readingTime wordCount intent monetizationMode categoryKey primaryKeyword thumbnail updatedAt createdAt isStandalone standalonePageType');
    
    if (!page) {
      return null;
    }

    return {
      _id: page._id,
      id: page._id.toString(), // Also include as string for convenience
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
      publishedAt: page.createdAt || page.updatedAt || null // publishedAt maps to createdAt (original publish date)
    };
  }

  /**
   * Get homepage for a tenant
   */
  static async getHomePage(tenantId) {
    const page = await Page.findOne({ 
      tenantId, 
      isHome: true 
    }).select('title slug meta content uxLayout schemaMarkup readingTime wordCount thumbnail updatedAt');
    
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
      publishedAt: page.createdAt || page.updatedAt || null // publishedAt maps to createdAt (original publish date)
    };
  }

  /**
   * List all pages for a tenant (for sitemap/menus)
   * Returns pages with essential fields for listing, sorted by updatedAt (newest first)
   * Excludes standalone pages (they appear only in footer)
   */
  static async listPagesForTenant(tenantId) {
    // Exclude standalone pages from regular listings
    const pages = await Page.find({ 
      tenantId,
      isStandalone: { $ne: true } // Exclude standalone pages
    })
      .select('_id slug title meta categoryKey readingTime wordCount thumbnail updatedAt isStandalone')
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
          isStandalone: page.isStandalone || false // Include for frontend filtering
        }))
    };
  }

  /**
   * Update page
   */
  static async updatePage(id, updates) {
    // Ensure updatedAt is set
    if (!updates.updatedAt) {
      updates.updatedAt = new Date();
    }
    return await Page.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).populate('tenantId');
  }

  /**
   * List pages for a tenant
   * Excludes standalone pages (they only appear in standalone API and slug lookups)
   */
  static async listPages(tenantId) {
    return await Page.find({ 
      tenantId,
      isStandalone: { $ne: true } // Exclude standalone pages
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
   */
  static async getAllPagesForTenant(tenantId, includeStandalone = false) {
    const query = { tenantId };
    if (!includeStandalone) {
      query.isStandalone = { $ne: true }; // Exclude standalone pages
    }
    
    const pages = await Page.find(query).select('_id title slug content meta categoryKey primaryKeyword intent monetizationMode readingTime wordCount updatedAt createdAt isStandalone standalonePageType').lean();
    
    // Map to include publishedAt (from createdAt) for frontend compatibility
    return pages.map(page => ({
      ...page,
      publishedAt: page.createdAt || page.updatedAt || null // publishedAt maps to createdAt
    }));
  }

  /**
   * Get standalone pages for a tenant
   */
  static async getStandalonePages(tenantId) {
    const pages = await Page.find({ 
      tenantId, 
      isStandalone: true 
    })
    .select('_id title slug standalonePageType updatedAt createdAt')
    .sort({ standalonePageType: 1 }) // Sort by page type for consistent ordering
    .lean();
    
    return pages.map(page => ({
      ...page,
      publishedAt: page.createdAt || page.updatedAt || null
    }));
  }
}

