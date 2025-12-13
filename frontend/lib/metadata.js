/**
 * Generate metadata for Next.js pages
 */

import { getPageBySlug, getHomePage } from './api';
import { getTenantIdFromHeaders } from './tenant';

/**
 * Generate metadata for a page
 */
export async function generateMetadata({ params, headers: headersParam }) {
  const tenantId = getTenantIdFromHeaders(headersParam);
  // For homepage, slug is 'home' or empty
  const slug = params?.slug === 'home' || !params?.slug ? 'home' : params.slug;

  if (!tenantId) {
    return {
      title: 'Page Not Found',
      description: 'Tenant not found',
    };
  }

  try {
    // For homepage, use getHomePage; otherwise use getPageBySlug
    const page = slug === 'home' 
      ? await getHomePage(tenantId)
      : await getPageBySlug(tenantId, slug);

    if (!page) {
      return {
        title: 'Page Not Found',
        description: 'The page you are looking for does not exist.',
      };
    }

    const meta = page.meta || {};
    const title = meta.title || page.title || 'MicroSite Empire AI';
    const description = meta.description || 
                       page.content?.substring(0, 160) || 
                       'MicroSite Empire AI - Multi-tenant micro-site CMS';
    const keywords = meta.keywords || [];
    const ogImage = meta.ogImage || null;

    // Get domain for canonical URL
    const tenantDomain = headersParam.get('x-tenant-domain') || headersParam.get('host') || 'localhost';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const canonical = `${protocol}://${tenantDomain}/${slug === 'home' ? '' : slug}`;

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
