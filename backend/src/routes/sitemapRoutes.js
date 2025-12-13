/**
 * Sitemap and Robots.txt Routes
 * Serves sitemap.xml and robots.txt for tenants
 */

import express from 'express';
import { SitemapService } from '../services/SitemapService.js';
import { TenantService } from '../services/TenantService.js';

const router = express.Router();

/**
 * GET /sitemap.xml
 * Serve sitemap for a tenant (domain-based)
 */
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const hostname = req.headers.host || '';
    const domain = hostname.split(':')[0].toLowerCase();

    const tenant = await TenantService.getTenantByDomain(domain);
    if (!tenant) {
      return res.status(404).send('Tenant not found');
    }

    const sitemapData = await SitemapService.getSitemap(tenant._id);
    res.set('Content-Type', 'application/xml');
    res.send(sitemapData.sitemap);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /robots.txt
 * Serve robots.txt for a tenant (domain-based)
 */
router.get('/robots.txt', async (req, res, next) => {
  try {
    const hostname = req.headers.host || '';
    const domain = hostname.split(':')[0].toLowerCase();

    const tenant = await TenantService.getTenantByDomain(domain);
    if (!tenant) {
      return res.status(404).send('User-agent: *\nDisallow: /');
    }

    const baseUrl = `https://${tenant.domain}`;
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robotsTxt = SitemapGenerator.generateRobotsTxt(baseUrl, sitemapUrl);

    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  } catch (error) {
    next(error);
  }
});

export default router;

