/**
 * Catch-all route for category/article pages
 * Handles: /categoryKey and /categoryKey/slug
 */

import { headers } from 'next/headers';
import { getTenantContext, getTenantIdFromHeaders } from '@/lib/tenant';
import { getPageBySlug, getCategoryLanding, listPages } from '@/lib/api';
import { Metadata } from 'next';
import PageRenderer from '@/components/PageRenderer';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SchemaMarkup from '@/components/seo/SchemaMarkup';
import ArticleList from '@/components/articles/ArticleList';
import CategorySidebar from '@/components/articles/CategorySidebar';
import styles from './page.module.css';

export const revalidate = 3600;

export async function generateMetadata({ params }): Promise<Metadata> {
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
    const page = await getPageBySlug(tenantId, slug);
    
    if (!page) {
      return { title: 'Page Not Found' };
    }

    const title = page.meta?.title || page.title;
    const description = page.meta?.description || '';
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

export default async function DynamicPathPage({ params }: any) {
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
      console.log('categoryKey', categoryKey);
      const category = context.siteDNA?.categories?.find(c => c.categoryKey === categoryKey);
      console.log('category', category);
      if (!category) {
        // Not a category, try as article slug
        const page = await getPageBySlug(tenantId, categoryKey);
        if (page) {
          return (
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
              thumbnail={page.thumbnail}
              isStandalone={page.isStandalone}
              updatedAt={page.updatedAt}
              publishedAt={page.publishedAt}
              adsenseId={context.tenant?.adsenseId}
            />
          );
        }
        notFound();
      }

      const { pages } = await getCategoryLanding(tenantId, categoryKey);
      console.log('pages', pages);
      // Fetch popular posts and categories for sidebar
      const allPages = await listPages(tenantId);
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
            primaryKeyword={page.primaryKeyword}
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
