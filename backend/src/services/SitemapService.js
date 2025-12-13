import { SitemapGenerator } from '../utils/sitemapGenerator.js';
import { PageService } from './PageService.js';
import { TenantService } from './TenantService.js';

export class SitemapService {
  /**
   * Generate and store sitemap for a tenant
   */
  static async updateSitemap(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const pages = await PageService.getAllPagesForTenant(tenantId);
    
    // Construct base URL from domain
    const baseUrl = `https://${tenant.domain}`;
    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    // Generate sitemap XML
    const sitemapXml = SitemapGenerator.generateSitemap(pages, baseUrl);
    
    // Generate robots.txt with enhanced rules
    const robotsTxt = SitemapGenerator.generateRobotsTxt(baseUrl, sitemapUrl, {
      disallowPaths: ['/admin', '/api'],
      allowPaths: ['/'],
      crawlDelay: null // Can be set if needed
    });

    return {
      sitemap: sitemapXml,
      robots: robotsTxt,
      urlCount: pages.length,
      baseUrl,
      sitemapUrl
    };
  }

  /**
   * Get sitemap XML for a tenant
   */
  static async getSitemap(tenantId) {
    return await this.updateSitemap(tenantId);
  }
}

