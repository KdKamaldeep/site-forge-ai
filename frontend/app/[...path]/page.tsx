/**
 * Catch-all route for category/article pages
 * Handles: /categoryKey and /categoryKey/slug
 */

import { headers } from 'next/headers';
import { getTenantContext, getTenantIdFromHeaders } from '@/lib/tenant';
import { getPageBySlug, getCategoryLanding, listPages } from '@/lib/api';
import { Metadata } from 'next';
import PageRenderer from '@/components/PageRenderer';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import SchemaMarkup from '@/components/seo/SchemaMarkup';
import ArticleList from '@/components/articles/ArticleList';
import CategorySidebar from '@/components/articles/CategorySidebar';
import { formatTitle, toTitleCaseSmart } from '@/lib/textFormat';
import { normalizeThumbnail, normalizeImageUrl } from '@/lib/imageUtils';
import styles from './page.module.css';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { path: string | string[] } }): Promise<Metadata> {
  const { path } = params;
  const pathArray = Array.isArray(path) ? path : [path];
  const headersList = await headers();
  const tenantId = getTenantIdFromHeaders(headersList);
  const context = await getTenantContext();
  const brandName = context.tenant?.brandIdentity?.brandName || context.tenant?.name || 'Site';
  
  if (pathArray.length === 1) {
    // Category page
    const categoryKey = pathArray[0];
    const category = context.siteDNA?.categories?.find(c => c.categoryKey === categoryKey);
    
    return {
      title: `${category?.description || categoryKey} | ${brandName}`,
      description: category?.description || `Explore ${categoryKey} content on ${brandName}`,
    };
  } else if (pathArray.length === 2) {
    // Article page
    const [categoryKey, slug] = pathArray;
    if (!tenantId) {
      return { title: 'Page Not Found' };
    }
    const page = await getPageBySlug(tenantId, slug);
    
    if (!page) {
      return { title: 'Page Not Found' };
    }

    // Get and clean title - remove duplication patterns like "how to X - how to X"
    let rawTitle = page.meta?.title || page.title || '';
    // Remove duplication pattern: "text - text" -> "text"
    rawTitle = rawTitle.replace(/^(.+?)\s*-\s*\1$/i, '$1').trim();
    // Format title properly (title case)
    const formattedTitle = formatTitle(rawTitle);
    // Add "(Step-by-Step)" for how-to guides if not already present
    const finalTitle = formattedTitle.toLowerCase().includes('how to') && !formattedTitle.toLowerCase().includes('step-by-step') && !formattedTitle.toLowerCase().includes('(step-by-step)')
      ? `${formattedTitle} (Step-by-Step)`
      : formattedTitle;
    
    // Clean description: remove any HTML tags (including meta tags) and decode entities
    const rawDescription = page.meta?.description || '';
    const description = rawDescription
      .replace(/<meta[^>]*>/gi, '') // Remove meta tags first
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Decode &amp;
      .replace(/&lt;/g, '<') // Decode &lt;
      .replace(/&gt;/g, '>') // Decode &gt;
      .replace(/&quot;/g, '"') // Decode &quot;
      .replace(/&#39;/g, "'") // Decode &#39;
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Canonical URL in format: /categoryKey/slug (match site's trailing slash behavior if needed)
    const canonical = `https://${context.tenant?.domain || ''}/${categoryKey}/${slug}`;
    
    // Get image: hero image from layout, fallback to thumbnail, then tenant logo
    let ogImage = null;
    if (page.uxLayout?.sections && Array.isArray(page.uxLayout.sections)) {
      const heroSection = page.uxLayout.sections.find((s: any) => s.type === 'hero');
      if (heroSection?.image) {
        ogImage = normalizeImageUrl(heroSection.image);
      }
    }
    if (!ogImage && page.thumbnail?.url) {
      ogImage = normalizeThumbnail(page.thumbnail)?.url || null;
    }
    if (!ogImage && context.tenant?.logo) {
      ogImage = normalizeImageUrl(context.tenant.logo);
    }

    return {
      title: `${finalTitle} | ${brandName}`,
      description,
      alternates: { canonical },
      openGraph: {
        title: finalTitle, // No brand suffix for OG
        description,
        type: 'article',
        url: canonical,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: 'summary',
        title: finalTitle, // No brand suffix for Twitter
        description,
        ...(ogImage && { images: [ogImage] }),
      },
    };
  }
  
  return { title: 'Page Not Found' };
}

export default async function DynamicPathPage({ params }: { params: { path: string | string[] } }) {
  const { path } = params;
  const pathArray = Array.isArray(path) ? path : [path];
  const headersList = await headers();
  const tenantId = getTenantIdFromHeaders(headersList);
  const context = await getTenantContext();

  if (!tenantId) {
    notFound();
  }

  try {
    if (pathArray.length === 1) {
      // Single segment: category landing page OR article slug needing redirect
      const categoryKey = pathArray[0];
      const category = context.siteDNA?.categories?.find(c => c.categoryKey === categoryKey);
      
      if (!category) {
        // Not a category, check if it's an article slug that needs redirecting
        const page = await getPageBySlug(tenantId, categoryKey);
        if (page && !page.isStandalone) {
          // Page exists and is not standalone - check if it has categoryKey for redirect
          const pageCategoryKey = page.categoryKey;
          // Validate categoryKey exists and is not empty/null/undefined
          const hasValidCategoryKey = pageCategoryKey && 
                                      typeof pageCategoryKey === 'string' && 
                                      pageCategoryKey.trim() !== '' && 
                                      pageCategoryKey.trim() !== 'null' && 
                                      pageCategoryKey.trim() !== 'undefined';
          
          if (hasValidCategoryKey) {
            // 301 Permanent Redirect: /slug -> /categoryKey/slug
            // Next.js redirect() uses 308 for GET requests, which is equivalent to 301 for SEO
            redirect(`/${pageCategoryKey.trim()}/${page.slug}`);
          }
          // Article page without valid categoryKey - show 404
          // (Ideally all articles should have categoryKey - this will be fixed for new pages)
          console.warn(`[Redirect] Page ${page.slug} exists but has no valid categoryKey, showing 404`);
          notFound();
        }
        // Page doesn't exist, is standalone, or other error - show 404
        notFound();
      }

      // Parallelize API calls for faster rendering
      const [categoryData, allPages] = await Promise.all([
        getCategoryLanding(tenantId, categoryKey),
        listPages(tenantId)
      ]);
      
      const { pages } = categoryData;
      const popularPages = Array.isArray(allPages) ? allPages.slice(0, 4) : [];
      const categories = context.siteDNA?.categories || [];
      
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: context.tenant?.brandIdentity?.brandName || 'Home',
            item: `https://${context.tenant?.domain || ''}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: category.description,
            item: `https://${context.tenant?.domain || ''}/${categoryKey}`,
          },
        ],
      };

      return (
        <>
          <SchemaMarkup schemas={[breadcrumbSchema]} />
          
          <div className={styles.categoryPage}>
            <div className={styles.container}>
              {/* Breadcrumbs */}
              <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
                <Link href="/" className={styles.breadcrumbLink}>Home</Link>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbCurrent}>{category.description}</span>
              </nav>

              <div className={styles.contentGrid}>
                {/* Main Content */}
                <main className={styles.mainContent}>
                  {/* Category Header */}
                  <header className={styles.categoryHeader}>
                    <h1 className={styles.categoryTitle}>
                      {category.description}
                    </h1>
                  </header>

                  {/* Article List */}
                  <ArticleList 
                    pages={pages}
                    categoryKey={categoryKey}
                    categoryDescription={category.description}
                  />
                </main>

                {/* Sidebar */}
                <CategorySidebar
                  popularArticles={popularPages}
                  categories={categories}
                  currentCategory={categoryKey}
                />
              </div>
            </div>
          </div>
        </>
      );
    } else if (pathArray.length === 2) {
      // Two segments: category/article
      const [categoryKey, slug] = pathArray;
      const page = await getPageBySlug(tenantId, slug);
      
      if (!page) {
        notFound();
      }

      // Verify category matches
      if (page.categoryKey && page.categoryKey !== categoryKey) {
        notFound();
      }

      // Quick fix: Ensure schemaMarkup mainEntityOfPage uses canonical URL with categoryKey
      let fixedSchemaMarkup = page.schemaMarkup;
      if (fixedSchemaMarkup && Array.isArray(fixedSchemaMarkup)) {
        const canonicalUrl = `https://${context.tenant?.domain || ''}/${categoryKey}/${slug}`;
        fixedSchemaMarkup = fixedSchemaMarkup.map((schema: any) => {
          if (schema['@type'] === 'Article' && schema.mainEntityOfPage) {
            return {
              ...schema,
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': canonicalUrl
              }
            };
          }
          return schema;
        });
      }

      return (
        <>
          <PageRenderer
            layout={page.uxLayout}
            content={page.content}
            meta={page.meta}
            title={page.title}
            schemaMarkup={fixedSchemaMarkup}
            readingTime={page.readingTime}
            wordCount={page.wordCount}
            intent={page.intent}
            monetizationMode={page.monetizationMode}
            categoryKey={categoryKey}
            updatedAt={page.updatedAt}
            thumbnail={page.thumbnail}
            isStandalone={page.isStandalone}
            publishedAt={page.publishedAt}
            adsenseId={context.tenant?.adsenseId}
          />
        </>
      );
    }

    notFound();
  } catch (error: any) {
    // Re-throw redirect errors - Next.js redirect() throws NEXT_REDIRECT errors that should propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Error loading page:', error);
    notFound();
  }
}
