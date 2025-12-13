import Navigation from '../models/Navigation.js';
import { PageService } from './PageService.js';
import Tenant from '../models/Tenant.js';

export class NavigationService {
  /**
   * Get navigation for a tenant
   * If no navigation exists, auto-generate from pages
   */
  static async getNavigation(tenantId) {
    let navigation = await Navigation.findOne({ tenantId });

    // If no navigation exists, auto-generate from pages
    if (!navigation) {
      const pagesList = await PageService.listPagesForTenant(tenantId);
      
      // Get tenant logo
      const tenant = await Tenant.findById(tenantId).select('logo');
      
      navigation = {
        logo: tenant?.logo || null,
        menu: pagesList.pages.map(page => ({
          label: page.title,
          slug: page.slug
        })),
        cta: {
          label: null,
          url: null
        }
      };
    } else {
      // Format existing navigation
      navigation = {
        logo: navigation.logo,
        menu: navigation.menu || [],
        cta: navigation.cta || {
          label: null,
          url: null
        }
      };
    }

    return navigation;
  }

  /**
   * Create or update navigation for a tenant
   */
  static async upsertNavigation(tenantId, data) {
    const navigation = await Navigation.findOneAndUpdate(
      { tenantId },
      {
        tenantId,
        logo: data.logo || null,
        menu: data.menu || [],
        cta: data.cta || {
          label: null,
          url: null
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return navigation;
  }

  /**
   * Delete navigation for a tenant
   */
  static async deleteNavigation(tenantId) {
    const navigation = await Navigation.findOneAndDelete({ tenantId });
    return navigation;
  }
}

