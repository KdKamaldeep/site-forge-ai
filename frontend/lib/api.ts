/**
 * Typed API client for Next.js SSR
 * All functions use process.env.NEXT_PUBLIC_API_BASE_URL
 * Uses native fetch for SSR compatibility
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// Types
export interface Tenant {
  _id: string;
  name: string;
  domain: string;
  logo?: string;
  brandIdentity?: {
    brandName: string;
    tagline: string;
    language: string;
    country: string;
    tone: string;
  };
  navigation?: NavigationItem[];
  contentPillars?: ContentPillar[];
  activePillar?: {
    categoryKey: string;
    pillarKeyword: string;
    targetSupportingCount: number;
    createdAt: string;
    completedAt?: string;
  };
  pillarHistoryNew?: PillarHistoryItem[];
  theme?: {
    colors: Record<string, string>;
    typography: Record<string, string>;
  };
  googleAnalyticsId?: string;
  adsenseId?: string;
}

export interface NavigationItem {
  label: string;
  path: string;
  categoryKey: string;
  icon?: string;
  order: number;
}

export interface ContentPillar {
  categoryKey: string;
  description: string;
  seedKeywords: string[];
  monetizationMode: 'adsense' | 'affiliate' | 'lead' | 'mixed';
  postingRatePerWeek: number;
}

export interface PillarHistoryItem {
  categoryKey: string;
  pillarKeyword: string;
  targetSupportingCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface Page {
  _id: string;
  title: string;
  slug: string;
  content: string;
  meta: {
    title?: string;
    description?: string;
    keywords?: string[];
    author?: {
      name?: string;
      bio?: string;
    };
    citations?: string[];
  };
  uxLayout?: any;
  schemaMarkup?: any;
  readingTime?: number;
  wordCount?: number;
  intent?: 'informational' | 'commercial' | 'lead';
  monetizationMode?: 'adsense' | 'affiliate' | 'lead' | 'mixed';
  categoryKey?: string;
  primaryKeyword?: string;
  updatedAt?: string;
  publishedAt?: string;
  isStandalone?: boolean;
  thumbnail?: string;
  standalonePageType?: 'privacy-policy' | 'about-us' | 'contact' | 'cookie-disclosure' | null;
}

export interface KeywordCluster {
  _id: string;
  tenantId: string;
  categoryKey: string;
  pillarKeyword: string;
  supportingTopics: SupportingTopic[];
}

export interface SupportingTopic {
  keyword: string;
  intent: 'informational' | 'commercial' | 'lead';
  suggestedSlug: string;
  status: 'planned' | 'created' | 'skipped';
  pageId?: string;
  createdAt: string;
}

export interface ClusterStats {
  total: number;
  planned: number;
  created: number;
  skipped: number;
}

/**
 * Fetch helper for SSR
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      cache: options?.cache || 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API] Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * Get tenant by domain (includes Site DNA)
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const normalizedDomain = domain.toLowerCase().trim();
  return fetchAPI<Tenant>(`/tenants/domain/${encodeURIComponent(normalizedDomain)}`);
}

/**
 * Get navigation from tenant (Site DNA navigation)
 */
export async function getNavigation(tenantId: string): Promise<NavigationItem[] | null> {
  const tenant = await getTenantByDomain(tenantId); // Fallback: try as domain first
  if (tenant?.navigation) {
    return tenant.navigation;
  }
  
  // Fallback to old navigation endpoint
  return fetchAPI<{ menu: NavigationItem[] }>(`/navigation/${tenantId}`).then(
    nav => nav?.menu || null
  );
}

/**
 * Get category landing page data
 */
export async function getCategoryLanding(
  tenantId: string,
  categoryKey: string
): Promise<{ category: ContentPillar | null; pages: Page[] }> {
  const tenant = await getTenantByDomain(tenantId).catch(() => null);
  const category = tenant?.contentPillars?.find(c => c.categoryKey === categoryKey) || null;
  
  const pages = await listPagesByCategory(tenantId, categoryKey, 1, 10);
  
  return { category, pages: pages || [] };
}

/**
 * List pages by category (paginated)
 */
export async function listPagesByCategory(
  tenantId: string,
  categoryKey: string,
  page: number = 1,
  limit: number = 10
): Promise<Page[] | null> {
  return fetchAPI<Page[]>(`/pages/category/${tenantId}/${categoryKey}?page=${page}&limit=${limit}`, {
    cache: 'no-store',
  });
}

/**
 * Get page by slug
 */
export async function getPageBySlug(tenantId: string, slug: string): Promise<Page | null> {
  return fetchAPI<Page>(`/pages/${tenantId}/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
}

/**
 * Get active pillar for tenant
 */
export async function getActivePillar(tenantId: string): Promise<Tenant['activePillar'] | null> {
  const tenant = await getTenantByDomain(tenantId);
  return tenant?.activePillar || null;
}

/**
 * Get keyword cluster
 */
export async function getKeywordCluster(
  tenantId: string,
  categoryKey: string,
  pillarKeyword: string
): Promise<KeywordCluster | null> {
  return fetchAPI<KeywordCluster>(
    `/clusters/${tenantId}/${encodeURIComponent(categoryKey)}/${encodeURIComponent(pillarKeyword)}`
  );
}

/**
 * Get latest report (optional)
 */
export async function getLatestReport(tenantId: string): Promise<any | null> {
  return fetchAPI(`/tenants/${tenantId}/reports/latest`);
}

/**
 * Trigger pillar generation run (admin only)
 */
export async function triggerRunPillar(domainOrTenantId: string, count?: number): Promise<any> {
  const body: any = {};
  if (count) body.count = count;
  
  return fetchAPI(`/pillar/run/${encodeURIComponent(domainOrTenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
    cache: 'no-store',
  });
}

/**
 * Get home page
 */
export async function getHomePage(tenantId: string): Promise<Page | null> {
  return fetchAPI<Page>(`/pages/home/${tenantId}`, {
    cache: 'no-store',
  });
}

/**
 * List all pages for tenant
 * Backend returns: { pages: [{ _id, slug, title, meta, categoryKey, readingTime, wordCount, updatedAt }] }
 */
export async function listPages(tenantId: string): Promise<Page[] | null> {
  const result = await fetchAPI<{ pages: Page[] }>(`/pages/list/${tenantId}`, {
    cache: 'no-store',
  });
  
  // Backend returns { pages: [...] }, so extract the array
  return result?.pages || null;
}

/**
 * Get standalone pages for tenant (Privacy Policy, About Us, Contact, Cookie Disclosure)
 * Backend returns: { pages: [{ _id, slug, title, standalonePageType, updatedAt }] }
 */
export async function getStandalonePages(tenantId: string): Promise<Page[] | null> {
  const result = await fetchAPI<{ pages: Page[] }>(`/pages/standalone/${tenantId}`, {
    cache: 'no-store',
  });
  
  return result?.pages || null;
}

