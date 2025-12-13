import { SearchConsoleService } from '../services/SearchConsoleService.js';
import { TenantService } from '../services/TenantService.js';

export class SearchConsoleController {
  /**
   * Initiate OAuth flow
   * GET /api/tenants/:tenantId/gsc/connect
   */
  static async connect(req, res, next) {
    try {
      const { tenantId } = req.params;
      
      // Verify tenant exists
      const tenant = await TenantService.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const authUrl = SearchConsoleService.getAuthUrl(tenantId);
      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  }

  /**
   * OAuth callback
   * GET /api/tenants/:tenantId/gsc/callback
   */
  static async callback(req, res, next) {
    try {
      const { tenantId } = req.params;
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
      }

      // Verify state matches tenantId
      if (state !== tenantId) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }

      // Exchange code for tokens
      const tokens = await SearchConsoleService.exchangeCodeForTokens(code);
      
      if (!tokens.refresh_token) {
        return res.status(400).json({ error: 'Refresh token not received. Please ensure prompt=consent is set.' });
      }

      // Get tenant to determine site URL
      const tenant = await TenantService.getTenantById(tenantId);
      const siteUrl = `sc-domain:${tenant.domain}`; // Use sc-domain for domain properties

      // Store refresh token
      await SearchConsoleService.connectTenant(tenantId, tokens.refresh_token, siteUrl);

      res.json({ 
        success: true, 
        message: 'Google Search Console connected successfully' 
      });
    } catch (error) {
      console.error('GSC callback error:', error);
      next(error);
    }
  }

  /**
   * Sync Search Console data
   * POST /api/tenants/:tenantId/gsc/sync
   */
  static async sync(req, res, next) {
    try {
      const { tenantId } = req.params;
      const { from, to } = req.query;

      // Default to last 7 days if not specified
      const toDate = to ? new Date(to) : new Date();
      const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const results = await SearchConsoleService.syncTenantData(tenantId, fromDate, toDate);
      
      res.json({
        success: true,
        ...results
      });
    } catch (error) {
      console.error('GSC sync error:', error);
      next(error);
    }
  }

  /**
   * Get connection status
   * GET /api/tenants/:tenantId/gsc/status
   */
  static async getStatus(req, res, next) {
    try {
      const { tenantId } = req.params;
      const SearchConsoleProperty = (await import('../models/SearchConsoleProperty.js')).default;
      
      const property = await SearchConsoleProperty.findOne({ tenantId });
      
      if (!property) {
        return res.json({ connected: false });
      }

      res.json({
        connected: property.verified,
        siteUrl: property.siteUrl,
        lastSyncAt: property.lastSyncAt
      });
    } catch (error) {
      next(error);
    }
  }
}

