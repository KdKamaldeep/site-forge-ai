/**
 * Preview route for pages
 * Shows pages regardless of published status
 * Route: /preview/[slug]
 */

import { headers } from 'next/headers';
import { getTenantContext, getTenantIdFromHeaders } from '@/lib/tenant';
import { getPageBySlugForPreview } from '@/lib/api';
import { Metadata } from 'next';
import PageRenderer from '@/components/PageRenderer';
import { notFound } from 'next/navigation';
import SchemaMarkup from '@/components/seo/SchemaMarkup';

export const revalidate = 0; // No caching for preview

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  const headersList = await headers();
  const tenantId = getTenantIdFromHeaders(headersList);
  const context = await getTenantContext();
  const brandName = context.tenant?.brandIdentity?.brandName || context.tenant?.name || 'Site';
  
  if (!tenantId) {
    return { title: 'Preview - Page Not Found' };
  }
  
  const page = await getPageBySlugForPreview(tenantId, slug);
  
  if (!page) {
    return { title: 'Preview - Page Not Found' };
  }

  const title = page.meta?.title || page.title;
  const description = page.meta?.description || '';
  const canonical = `https://${context.tenant?.domain || ''}/preview/${slug}`;

  return {
    title: `[PREVIEW] ${title} | ${brandName}`,
    description: description ? `[PREVIEW] ${description}` : `Preview of ${title}`,
    alternates: { canonical },
    robots: {
      noindex: true, // Don't index preview pages
      nofollow: true,
    },
  };
}

export default async function PreviewPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const headersList = await headers();
  const tenantId = getTenantIdFromHeaders(headersList);
  const context = await getTenantContext();

  if (!tenantId) {
    notFound();
  }

  try {
    const page = await getPageBySlugForPreview(tenantId, slug);
    
    if (!page) {
      notFound();
    }

    // Show preview banner if page is unpublished
    const isUnpublished = page.published === false;

    return (
      <>
        {isUnpublished && (
          <div style={{
            background: '#fef3c7',
            borderBottom: '2px solid #f59e0b',
            padding: '1rem',
            textAlign: 'center',
            fontWeight: 600,
            color: '#92400e'
          }}>
            ⚠️ PREVIEW MODE - This page is not published
          </div>
        )}
        <SchemaMarkup schema={page.schemaMarkup} />
        <PageRenderer page={page} />
      </>
    );
  } catch (error) {
    console.error('Error loading preview page:', error);
    notFound();
  }
}

