/**
 * Generate metadata for Next.js pages
 */

import { getPageBySlug, getHomePage, getTenantByDomain } from './api';
import { getTenantIdFromHeaders, getTenantDomainFromHeaders } from './tenant';

/**
 * Generate metadata for a page
 */
export async function generateMetadata({ params, headers: headersParam }) {
  const tenantId = getTenantIdFromHeaders(headersParam);
  const tenantDomain = getTenantDomainFromHeaders(headersParam);
  // For homepage, slug is 'home' or empty
  const slug = params?.slug === 'home' || !params?.slug ? 'home' : params.slug;

  if (!tenantId && !tenantDomain) {
    return {
      title: 'Page Not Found',
      description: 'Tenant not found',
    };
  }

  try {
    // Get tenant information for title
    let tenant = null;
    if (tenantDomain || tenantId) {
      try {
        tenant = await getTenantByDomain(tenantDomain || tenantId);
      } catch (error) {
        console.warn('Could not fetch tenant for metadata:', error);
      }
    }

    const brandName = tenant?.brandIdentity?.brandName || tenant?.name || 'Site';

    // For homepage, use getHomePage; otherwise use getPageBySlug
    const page = slug === 'home' 
      ? await getHomePage(tenantId)
      : await getPageBySlug(tenantId, slug);

    if (!page) {
      // For home page, show tenant name instead of "Page Not Found"
      if (slug === 'home') {
        return {
          title: `${brandName} - Home`,
          description: `Welcome to ${brandName}`,
        };
      }
      return {
        title: 'Page Not Found',
        description: 'The page you are looking for does not exist.',
      };
    }

    const meta = page.meta || {};
    // For home page, ensure title includes tenant name
    const pageTitle = meta.title || page.title || (slug === 'home' ? `${brandName} - Home` : 'MicroSite Empire AI');
    const title = slug === 'home' && !meta.title && !page.title 
      ? `${brandName} - Home` 
      : pageTitle;
    const description = meta.description || 
                       page.content?.substring(0, 160) || 
                       'MicroSite Empire AI - Multi-tenant micro-site CMS';
    const keywords = meta.keywords || [];
    // Use thumbnail first, fallback to ogImage
    const ogImage = page.thumbnail?.url || meta.ogImage || null;

    // Get domain for canonical URL
    const domain = tenantDomain || headersParam.get('x-tenant-domain') || headersParam.get('host') || 'localhost';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const canonical = `${protocol}://${domain}/${slug === 'home' ? '' : slug}`;

    return {
      title,
      description,
      keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonical,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error',
      description: 'An error occurred while loading the page.',
    };
  }
}
