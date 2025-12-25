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

    const title = page.meta?.title || page.title;
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

    return {
      title: `${title} | ${brandName}`,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: 'article',
        url: canonical,
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
      // Single segment: category landing page
      const categoryKey = pathArray[0];
      const category = context.siteDNA?.categories?.find(c => c.categoryKey === categoryKey);
      if (!category) {
        // Not a category, check if it's an article slug that needs redirecting
        const page = await getPageBySlug(tenantId, categoryKey);
        if (page && page.categoryKey && !page.isStandalone) {
          // Redirect /slug to /categoryKey/slug with permanent redirect (308 for GET = 301 equivalent)
          redirect(`/${page.categoryKey}/${page.slug}`);
        }
        // If page doesn't exist or doesn't have categoryKey, or is standalone, show 404
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

      return (
        <>
          <PageRenderer
            layout={page.uxLayout}
            content={page.content}
            meta={page.meta}
            title={page.title}
            schemaMarkup={page.schemaMarkup}
            readingTime={page.readingTime}
            wordCount={page.wordCount}
            intent={page.intent}
            monetizationMode={page.monetizationMode}
            categoryKey={page.categoryKey}
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
  } catch (error) {
    console.error('Error loading page:', error);
    notFound();
  }
}
