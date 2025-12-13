import { PageService } from '../services/PageService.js';
import slugify from '../utils/slugify.js';
import mongoose from 'mongoose';

export class PageController {
  /**
   * Create a new page
   */
  static async create(req, res, next) {
    try {
      const data = {
        ...req.body,
        tenantId: req.body.tenantId || req.tenantId,
        slug: req.body.slug || slugify(req.body.title)
      };
      
      const page = await PageService.createPage(data);
      res.status(201).json(page);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get page by tenant and slug (for Next.js SSR)
   * Returns: { title, slug, meta, content, uxLayout, updatedAt }
   */
  static async getBySlug(req, res, next) {
    try {
      const { tenantId, slug } = req.params;
      
      if (!tenantId || !slug) {
        return res.status(400).json({ error: 'tenantId and slug are required' });
      }

      // Validate tenantId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return res.status(400).json({ error: 'Invalid tenantId format' });
      }

      const page = await PageService.getPageBySlug(tenantId, slug);
      
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      
      res.json(page);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get homepage for a tenant (for Next.js SSR)
   * Returns: { title, slug, meta, content, uxLayout, updatedAt }
   */
  static async getHomePage(req, res, next) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Validate tenantId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return res.status(400).json({ error: 'Invalid tenantId format' });
      }

      const page = await PageService.getHomePage(tenantId);
      
      if (!page) {
        return res.status(404).json({ error: 'Homepage not found' });
      }
      
      res.json(page);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all pages for a tenant (for sitemap/menus)
   * Returns: { pages: [{ slug, title }] }
   */
  static async listPages(req, res, next) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Validate tenantId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return res.status(400).json({ error: 'Invalid tenantId format' });
      }

      const result = await PageService.listPagesForTenant(tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List pages by category (paginated)
   * Returns: Array of pages with full data
   */
  static async listByCategory(req, res, next) {
    try {
      const { tenantId, categoryKey } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      if (!tenantId || !categoryKey) {
        return res.status(400).json({ error: 'tenantId and categoryKey are required' });
      }

      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return res.status(400).json({ error: 'Invalid tenantId format' });
      }

      const pages = await PageService.getAllPagesForTenant(tenantId);
      const filtered = pages
        .filter(p => p.categoryKey === categoryKey)
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        .slice(skip, skip + limit);

      res.json(filtered);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get page by ID
   */
  static async getById(req, res, next) {
    try {
      const page = await PageService.getPageById(req.params.id);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      res.json(page);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update page
   */
  static async update(req, res, next) {
    try {
      const page = await PageService.updatePage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      res.json(page);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List pages for a tenant
   */
  static async list(req, res, next) {
    try {
      const tenantId = req.params.tenantId || req.tenantId;
      const pages = await PageService.listPages(tenantId);
      res.json(pages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete page
   */
  static async delete(req, res, next) {
    try {
      const page = await PageService.deletePage(req.params.id);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      res.json({ message: 'Page deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

