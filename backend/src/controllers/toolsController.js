import { PageService } from '../services/PageService.js';
import { TenantService } from '../services/TenantService.js';
import { KeywordService } from '../services/KeywordService.js';
import { UXLayoutService } from '../services/UXLayoutService.js';
import { SitemapService } from '../services/SitemapService.js';
import { ContentRefreshService } from '../services/ContentRefreshService.js';
import { InternalLinkingService } from '../services/InternalLinkingService.js';
import { MicrositeBuilderAgent } from '../agents/micrositeBuilderAgent.js';
import { GeminiImageService } from '../services/GeminiImageService.js';
import { ImageOptimizationService } from '../services/ImageOptimizationService.js';
import slugify from '../utils/slugify.js';

export class ToolsController {
  /**
   * Tool: createPage
   */
  static async createPage(req, res, next) {
    try {
      const { tenantId, title, slug, content, meta, uxLayout } = req.body;

      if (!tenantId || !title || !content) {
        return res.status(400).json({ error: 'tenantId, title, and content are required' });
      }

      // Get tenant for image generation context
      let tenant = null;
      try {
        tenant = await TenantService.getTenantById(tenantId);
      } catch (error) {
        console.warn('Could not fetch tenant for image generation:', error.message);
      }

      // Process UX layout - generate images if missing
      let processedLayout = uxLayout || { sections: [] };
      
      // Generate images for the layout if Gemini is configured
      if (process.env.GEMINI_API_KEY && processedLayout.sections && processedLayout.sections.length > 0) {
        try {
          console.log(`[ToolsController] Generating images for page: ${title}`);
          processedLayout = await GeminiImageService.generateLayoutImages(
            processedLayout,
            title,
            tenant,
            content // Pass content to extract image prompts
          );
          
          // Optimize the generated images
          processedLayout = ImageOptimizationService.optimizeLayoutImages(processedLayout);
          console.log(`[ToolsController] Images generated and optimized for: ${title}`);
        } catch (error) {
          console.warn(`[ToolsController] Image generation failed for ${title}:`, error.message);
          // Continue without images if generation fails
        }
      }

      const pageData = {
        tenantId,
        title,
        slug: slug || slugify(title),
        content,
        meta: meta || {},
        uxLayout: processedLayout
      };

      const page = await PageService.createPage(pageData);
      res.json({ success: true, page });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tool: updatePage
   */
  static async updatePage(req, res, next) {
    try {
      const { pageId, content, meta, uxLayout } = req.body;

      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }

      const updates = {};
      if (content) updates.content = content;
      if (meta) updates.meta = meta;
      if (uxLayout) updates.uxLayout = uxLayout;

      const page = await PageService.updatePage(pageId, updates);
      res.json({ success: true, page });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tool: generateKeywords
   */
  static async generateKeywords(req, res, next) {
    try {
      const { topic, count = 10, tenantId } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'topic is required' });
      }

      const keywords = await KeywordService.generateKeywords(topic, count, tenantId);
      res.json({ success: true, keywords });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tool: generateUXLayout
   */
  static async generateUXLayout(req, res, next) {
    try {
      const { content, style = 'standard' } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'content is required' });
      }

      const uxLayout = await UXLayoutService.generateUXLayout(content, style);
      res.json({ success: true, uxLayout });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tool: fetchPage
   */
  static async fetchPage(req, res, next) {
    try {
      const { tenantId, slug } = req.body;

      if (!tenantId || !slug) {
        return res.status(400).json({ error: 'tenantId and slug are required' });
      }

      const page = await PageService.getPageBySlug(tenantId, slug);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.json({ success: true, page });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tool: switchTheme
   */
  static async switchTheme(req, res, next) {
    try {
      const { tenantId, themeId } = req.body;

      if (!tenantId || !themeId) {
        return res.status(400).json({ error: 'tenantId and themeId are required' });
      }

      const tenant = await TenantService.updateTheme(tenantId, themeId);
      res.json({ success: true, tenant });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tool: updateSitemap
   */
  static async updateSitemap(req, res, next) {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const sitemap = await SitemapService.updateSitemap(tenantId);
      res.json({ success: true, sitemap });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tool: refreshContent
   */
  static async refreshContent(req, res, next) {
    try {
      const { pageId } = req.body;

      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }

      const page = await ContentRefreshService.refreshContent(pageId);
      res.json({ success: true, page });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/tools/buildMicrosite:
   *   post:
   *     summary: Run Microsite Builder Agent
   *     description: Builds a complete microsite by creating multiple pages with AI-generated content, keywords, UX layouts, internal linking, and sitemap updates.
   *     tags: [Tools]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tenantId
   *               - topics
   *             properties:
   *               tenantId:
   *                 type: string
   *                 description: Tenant ID
   *               topics:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of topics to create pages for
   *                 example: ["Travel Tips", "Destinations", "Travel Guides"]
   *     responses:
   *       200:
   *         description: Microsite build completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 results:
   *                   type: object
   *                   properties:
   *                     pagesCreated:
   *                       type: number
   *                     pages:
   *                       type: array
   *                       items:
   *                         type: object
   *                     errors:
   *                       type: array
   *       400:
   *         description: Bad request (missing tenantId or topics)
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Tenant not found
   *       500:
   *         description: Server error
   */
  /**
   * Tool: buildMicrosite (Run Microsite Builder Agent)
   * Creates multiple pages with AI-generated content for a tenant
   */
  static async buildMicrosite(req, res, next) {
    try {
      const { tenantId, topics } = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({ error: 'topics array is required and must not be empty' });
      }

      // Validate tenant exists
      const tenant = await TenantService.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      console.log(`[MicrositeBuilderAgent] Starting build for tenant: ${tenant.name} (${tenant.domain})`);
      console.log(`[MicrositeBuilderAgent] Topics: ${topics.join(', ')}`);

      // Run the agent
      const results = await MicrositeBuilderAgent.buildMicrosite(tenantId, topics);

      console.log(`[MicrositeBuilderAgent] Build complete. Created ${results.pages.length} pages. Errors: ${results.errors.length}`);

      res.json({
        success: true,
        message: `Microsite build completed. Created ${results.pages.length} pages.`,
        results: {
          pagesCreated: results.pages.length,
          pages: results.pages.map(p => ({
            id: p._id,
            title: p.title,
            slug: p.slug
          })),
          errors: results.errors
        }
      });
    } catch (error) {
      console.error('[MicrositeBuilderAgent] Error:', error);
      next(error);
    }
  }
}

