import Tenant from '../models/Tenant.js';
import { LogoService } from './LogoService.js';

export class TenantService {
  /**
   * Create a new tenant
   */
  static async createTenant(data) {
    const tenant = new Tenant(data);
    const savedTenant = await tenant.save();
    
    // Auto-generate logo if not provided and GEMINI_API_KEY is available
    if (!savedTenant.logo && process.env.GEMINI_API_KEY) {
      try {
        console.log(`🎨 Auto-generating logo for tenant: ${savedTenant.name}`);
        const logoUrl = await LogoService.generateLogoWithRetry(savedTenant, 2);
        if (logoUrl) {
          savedTenant.logo = logoUrl;
          await savedTenant.save();
          console.log(`✅ Logo generated and saved for tenant: ${savedTenant.name}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to auto-generate logo for tenant ${savedTenant.name}:`, error.message);
        // Continue without logo - tenant can set it manually later
      }
    }
    
    return savedTenant;
  }

  /**
   * Get tenant by ID
   * Note: populate('themeId') removed to avoid schema registration issues in scripts
   * Use tenant.theme directly instead of themeId
   */
  static async getTenantById(id) {
    return await Tenant.findById(id);
  }

  /**
   * Get tenant by domain (for Next.js SSR)
   * Returns formatted response with theme, logo, settings
   */
  static async getTenantByDomain(domain) {
    const normalizedDomain = domain.toLowerCase().trim();
    console.log(`[TenantService] Looking for tenant with domain: "${normalizedDomain}"`);
    
    // Don't populate themeId - we use tenant.theme directly
    // This avoids the "Schema hasn't been registered" error in scripts
    const tenant = await Tenant.findOne({ domain: normalizedDomain });
    
    if (!tenant) {
      console.log(`[TenantService] Tenant not found for domain: "${normalizedDomain}"`);
      // List all existing domains for debugging
      const allTenants = await Tenant.find({}, 'domain name').limit(10);
      console.log(`[TenantService] Available tenants:`, allTenants.map(t => ({ domain: t.domain, name: t.name })));
      return null;
    }

    console.log(`[TenantService] Tenant found: ${tenant.name} (${tenant.domain})`);

    // Format response for Next.js frontend
    // Include all Site DNA fields: brandIdentity, navigation, contentPillars, activePillar, etc.
    const response = {
      _id: tenant._id,
      name: tenant.name,
      domain: tenant.domain,
      logo: tenant.logo || tenant.settings?.logo || null,
      theme: {
        colors: tenant.theme?.colors || {},
        typography: tenant.theme?.typography || {}
      },
      settings: tenant.settings || {},
      // Site DNA fields
      brandIdentity: tenant.brandIdentity || null,
      navigation: tenant.navigation || [],
      contentPillars: tenant.contentPillars || [],
      standalonePages: tenant.standalonePages || [],
      activePillar: tenant.activePillar || null,
      pillarHistoryNew: tenant.pillarHistoryNew || [],
      monetization: tenant.monetization || null,
      compliance: tenant.compliance || null,
      publishingStrategy: tenant.publishingStrategy || null,
      googleAnalyticsId: tenant.googleAnalyticsId || null
    };

    console.log(`[TenantService] Returning tenant data for: ${response.name}`);
    console.log(`[TenantService] Navigation items: ${response.navigation.length}, Categories: ${response.contentPillars.length}`);
    return response;
  }

  /**
   * Update tenant theme
   */
  static async updateTheme(tenantId, themeId) {
    return await Tenant.findByIdAndUpdate(
      tenantId,
      { themeId },
      { new: true }
    );
  }

  /**
   * Update tenant settings
   */
  static async updateSettings(tenantId, settings) {
    return await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: { settings } },
      { new: true }
    );
  }

  /**
   * List all tenants
   */
  static async listTenants() {
    return await Tenant.find().sort({ createdAt: -1 });
  }

  /**
   * Delete tenant
   */
  static async deleteTenant(tenantId) {
    return await Tenant.findByIdAndDelete(tenantId);
  }
}

