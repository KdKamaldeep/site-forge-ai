/**
 * Tenant context utilities
 * Single source of truth for tenant data in server components
 */

import { headers } from 'next/headers';
import { getTenantByDomain, getNavigation, type Tenant, type NavigationItem } from './api';

export interface TenantContext {
  tenant: Tenant | null;
  siteDNA: {
    brand: Tenant['brandIdentity'];
    nav: NavigationItem[];
    categories: Tenant['contentPillars'];
  } | null;
  activePillar: Tenant['activePillar'] | null;
}

/**
 * Get tenant ID from headers (set by middleware)
 */
export function getTenantIdFromHeaders(headersList: Headers): string | null {
  return headersList.get('x-tenant-id');
}

/**
 * Get tenant domain from headers
 */
export function getTenantDomainFromHeaders(headersList: Headers): string | null {
  return headersList.get('x-tenant-domain');
}

/**
 * Get complete tenant context (tenant + Site DNA + active pillar)
 * This is the single source of truth for tenant data
 */
export async function getTenantContext(): Promise<TenantContext> {
  const headersList = await headers();
  const tenantDomain = getTenantDomainFromHeaders(headersList);
  const tenantId = getTenantIdFromHeaders(headersList);

  if (!tenantDomain && !tenantId) {
    return {
      tenant: null,
      siteDNA: null,
      activePillar: null,
    };
  }

  try {
    // Try to fetch by domain first (more reliable)
    const domain = tenantDomain || tenantId;
    const tenant = await getTenantByDomain(domain);

    if (!tenant) {
      return {
        tenant: null,
        siteDNA: null,
        activePillar: null,
      };
    }

    // Extract Site DNA
    const siteDNA = {
      brand: tenant.brandIdentity || null,
      nav: tenant.navigation || [],
      categories: tenant.contentPillars || [],
    };

    // Debug logging
    console.log('[TenantContext] Navigation items:', siteDNA.nav.length);
    console.log('[TenantContext] Categories:', siteDNA.categories.length);
    console.log('[TenantContext] Active pillar:', tenant.activePillar ? 'Yes' : 'No');

    return {
      tenant,
      siteDNA,
      activePillar: tenant.activePillar || null,
    };
  } catch (error) {
    console.error('[TenantContext] Error loading tenant:', error);
    return {
      tenant: null,
      siteDNA: null,
      activePillar: null,
    };
  }
}

/**
 * Get tenant only (lightweight)
 */
export async function getTenant(): Promise<Tenant | null> {
  const context = await getTenantContext();
  return context.tenant;
}

