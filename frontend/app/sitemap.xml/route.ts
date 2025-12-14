/**
 * Sitemap.xml Route Handler
 * Generates and serves sitemap.xml for the tenant
 * Accessible at /sitemap (can be configured to /sitemap.xml via rewrite)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTenantContext } from '@/lib/tenant';
import { listPages } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

/**
 * Generate sitemap XML from pages
 */
function generateSitemapXML(pages: any[], baseUrl: string): string {
  const urls = pages
    .filter(page => !page.isStandalone) // Exclude standalone pages from sitemap
    .map(page => {
      console.log('page', page.categoryKey);
      console.log('===============================================');
      // Construct URL with categoryKey if available
      let urlPath = '';
      if (page.slug === 'home' || (page as any).isHome) {
        urlPath = '';
      } else {
        // Check if categoryKey exists and is valid
        const categoryKey = page.categoryKey;
        const hasValidCategoryKey = categoryKey != null && 
                                    categoryKey !== '' && 
                                    String(categoryKey).trim() !== '' && 
                                    String(categoryKey).trim() !== 'null' && 
                                    String(categoryKey).trim() !== 'undefined';
        
        if (hasValidCategoryKey) {
          // Include categoryKey in URL: /categoryKey/slug
          urlPath = `${String(categoryKey).trim()}/${page.slug}`;
        } else {
          // Fallback to just slug if no categoryKey
          urlPath = page.slug;
        }
      }
      
      // Build URL - handle baseUrl and path separately to avoid collapsing protocol slashes
      // Don't use replace(/\/+/g, '/') on the full URL as it will collapse https:// to https:/
      let url = baseUrl;
      if (urlPath) {
        // Remove trailing slash from baseUrl
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        // Ensure path starts with / and collapse multiple slashes (but not at the start)
        const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
        // Collapse multiple consecutive slashes in path (but preserve the leading /)
        const normalizedPath = cleanPath.replace(/\/(\/+)/g, '/');
        url = `${cleanBaseUrl}${normalizedPath}`;
      }
      const lastmod = page.updatedAt 
        ? new Date(page.updatedAt).toISOString() 
        : new Date().toISOString();
      
      // Determine change frequency
      let changefreq = 'monthly';
      if (page.isHome) changefreq = 'daily';
      else if (page.slug?.includes('blog') || page.slug?.includes('news')) changefreq = 'weekly';
      
      // Determine priority
      let priority = '0.8';
      if ((page as any).isHome) priority = '1.0';
      else if (page.slug === 'about' || page.slug === 'contact') priority = '0.9';
      
      return `  <url>
    <loc>${escapeXML(url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * GET /sitemap
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context
    const context = await getTenantContext();
    const tenant = context.tenant;

    if (!tenant) {
      return new NextResponse('Tenant not found', { status: 404 });
    }

    // Get tenant ID from headers or use domain
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || tenant._id;
    
    // Fetch all pages for the tenant (includes categoryKey and isHome)
    const pages = await listPages(tenantId);
    
    // Debug: Log sample pages to verify categoryKey is present
    if (pages && pages.length > 0) {
      console.log(`[Sitemap] Total pages: ${pages.length}`);
      const samplePages = pages.slice(0, 5).map(p => ({
        slug: p.slug,
        categoryKey: p.categoryKey,
        categoryKeyType: typeof p.categoryKey,
        categoryKeyValue: String(p.categoryKey),
        hasCategoryKey: p.categoryKey != null && p.categoryKey !== '' && String(p.categoryKey).trim() !== '' && String(p.categoryKey).trim() !== 'null',
        isStandalone: p.isStandalone,
        isHome: (p as any).isHome || false
      }));
      console.log(`[Sitemap] Sample pages:`, JSON.stringify(samplePages, null, 2));
      
      // Count pages with categoryKey
      const withCategory = pages.filter(p => {
        const ck = p.categoryKey;
        return ck != null && ck !== '' && String(ck).trim() !== '' && String(ck).trim() !== 'null' && String(ck).trim() !== 'undefined';
      }).length;
      console.log(`[Sitemap] Pages with categoryKey: ${withCategory} out of ${pages.length}`);
    }
    
    if (!pages || pages.length === 0) {
      // Return empty sitemap if no pages
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    // Construct base URL from tenant domain
    const baseUrl = `https://${tenant.domain}`;
    
    // Generate sitemap XML
    const sitemapXML = generateSitemapXML(pages, baseUrl);

    // Return XML response
    return new NextResponse(sitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
