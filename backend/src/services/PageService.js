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
    }).select('_id title slug meta content uxLayout schemaMarkup readingTime wordCount intent monetizationMode categoryKey primaryKeyword thumbnail updatedAt');
    
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
      updatedAt: page.updatedAt
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
      content: page.content,
      uxLayout: page.uxLayout || { layout: 'StandardArticle', sections: [] },
      schemaMarkup: page.schemaMarkup || null,
      readingTime: page.readingTime || null,
      wordCount: page.wordCount || null,
      thumbnail: page.thumbnail || null,
      updatedAt: page.updatedAt
    };
  }

  /**
   * List all pages for a tenant (for sitemap/menus)
   * Returns pages with essential fields for listing, sorted by updatedAt (newest first)
   */
  static async listPagesForTenant(tenantId) {
    const pages = await Page.find({ tenantId })
      .select('_id slug title meta categoryKey readingTime wordCount thumbnail updatedAt')
      .sort({ updatedAt: -1 }); // Newest first
    
    return {
      pages: pages.map(page => ({
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
        updatedAt: page.updatedAt
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
   */
  static async listPages(tenantId) {
    return await Page.find({ tenantId })
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
   */
  static async getAllPagesForTenant(tenantId) {
    return await Page.find({ tenantId }).select('_id title slug content meta categoryKey primaryKeyword intent monetizationMode readingTime wordCount updatedAt createdAt');
  }
}

