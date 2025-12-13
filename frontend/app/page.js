import { getTenantContext, getTenantIdFromHeaders } from '@/lib/tenant';
import { getHomePage, listPages } from '@/lib/api';
import PageRenderer from '@/components/PageRenderer';
import { generateMetadata as generatePageMetadata } from '@/lib/metadata';
import { headers } from 'next/headers';
import NewsFlash from '@/components/home/NewsFlash';
import FeaturedGrid from '@/components/home/FeaturedGrid';
import LatestNewsSection from '@/components/home/LatestNewsSection';
import EditorsPicksSection from '@/components/home/EditorsPicksSection';
import Pagination from '@/components/home/Pagination';
import HomeSidebar from '@/components/home/HomeSidebar';
import styles from './page.module.css';

// ISR: Revalidate every hour
export const revalidate = 3600;

export async function generateMetadata() {
  const headersList = await headers();
  return generatePageMetadata({ params: { slug: 'home' }, headers: headersList });
}

export default async function HomePage() {
  const headersList = await headers();
  const tenantId = getTenantIdFromHeaders(headersList);

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Tenant Not Found</h1>
        <p>Unable to resolve tenant. Please check your domain configuration.</p>
      </div>
    );
  }

  const context = await getTenantContext();
  const categories = context.siteDNA?.categories || [];

  try {
    // Fetch homepage
    const page = await getHomePage(tenantId);
    
    // Fetch latest pages
    const latestPages = await listPages(tenantId);
    const allArticles = Array.isArray(latestPages) ? latestPages : [];

    // If no homepage, show default home with new design
    if (!page) {
      // Featured: 6 articles in grid
      const featuredArticles = allArticles.slice(0, 6);
      
      // Latest News: Next articles (will be paginated)
      const latestArticles = allArticles.slice(6);
      
      // Popular for sidebar (top 4)
      const popularArticles = allArticles.slice(0, 4);
      
      // Editor's Picks: Mix from different categories, exclude featured/latest
      const usedIds = new Set([...featuredArticles.map(a => a._id), ...latestArticles.slice(0, 8).map(a => a._id)].filter(Boolean));
      const editorPicksArticles = allArticles.filter(a => !usedIds.has(a._id)).slice(0, 6);

      // News flash items
      const newsFlashItems = allArticles.slice(0, 3).map(p => p.title).filter(Boolean);

      return (
        <div className={styles.homePage}>
          {/* NewsFlash Ticker */}
          {newsFlashItems.length > 0 && (
            <NewsFlash newsItems={newsFlashItems} />
          )}

          {/* Hero Featured Grid */}
          {featuredArticles.length > 0 && (
            <FeaturedGrid articles={featuredArticles} />
          )}

          {/* Latest News Section with Tabs + Grid + Sidebar */}
          {latestArticles.length > 0 && (
            <LatestNewsSection
              articles={latestArticles}
              categories={categories}
              sidebarContent={
                <HomeSidebar
                  popularArticles={popularArticles}
                  categories={categories}
                />
              }
            />
          )}

          {/* Editor's Picks Section */}
          {editorPicksArticles.length > 0 && (
            <EditorsPicksSection
              articles={editorPicksArticles}
              title="Editor's Picks"
            />
          )}

          {/* Pagination Wrapper */}
          {latestArticles.length > 12 && (
            <div className={styles.paginationWrapper}>
              <Pagination items={latestArticles} itemsPerPage={12}>
                {(paginatedItems) => (
                  <LatestNewsSection
                    articles={paginatedItems}
                    categories={categories}
                    sidebarContent={null}
                  />
                )}
              </Pagination>
            </div>
          )}
        </div>
      );
    }

    // Render homepage with PageRenderer if a custom homepage exists
    return (
      <PageRenderer 
        layout={page.uxLayout} 
        content={page.content}
        meta={page.meta}
        title={page.title}
        schemaMarkup={page.schemaMarkup}
        readingTime={page.readingTime}
        wordCount={page.wordCount}
      />
    );
  } catch (error) {
    console.error('Error loading home page:', error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Error Loading Page</h1>
        <p>An error occurred while loading the page.</p>
      </div>
    );
  }
}
