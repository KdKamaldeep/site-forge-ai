import { TenantService } from '../services/TenantService.js';
import slugify from '../utils/slugify.js';

export class TenantController {
  /**
   * Create a new tenant
   */
  static async create(req, res, next) {
    try {
      const tenant = await TenantService.createTenant(req.body);
      res.status(201).json(tenant);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant by ID
   */
  static async getById(req, res, next) {
    try {
      const tenant = await TenantService.getTenantById(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant by domain (for Next.js SSR)
   * Returns: { _id, name, domain, theme, settings, logo }
   */
  static async getByDomain(req, res, next) {
    try {
      const domain = req.params.domain.toLowerCase().trim();
      console.log(`[TenantController] GET /api/tenants/domain/${domain}`);
      
      const tenant = await TenantService.getTenantByDomain(domain);
      
      if (!tenant) {
        console.log(`[TenantController] Tenant not found for domain: ${domain}`);
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      console.log(`[TenantController] Returning tenant: ${tenant.name}`);
      res.json(tenant);
    } catch (error) {
      console.error(`[TenantController] Error:`, error);
      next(error);
    }
  }

  /**
   * Update tenant theme
   */
  static async updateTheme(req, res, next) {
    try {
      const tenant = await TenantService.updateTheme(req.params.id, req.body.themeId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tenant settings
   */
  static async updateSettings(req, res, next) {
    try {
      const tenant = await TenantService.updateSettings(req.params.id, req.body.settings);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all tenants
   */
  static async list(req, res, next) {
    try {
      const tenants = await TenantService.listTenants();
      res.json(tenants);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete tenant
   */
  static async delete(req, res, next) {
    try {
      const tenant = await TenantService.deleteTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json({ message: 'Tenant deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

