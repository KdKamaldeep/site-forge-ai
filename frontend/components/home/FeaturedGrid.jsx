/**
 * FeaturedGrid Component
 * Hero section with 6 small featured article cards in a grid
 */

import Link from 'next/link';
import CategoryBadge from '@/components/articles/CategoryBadge';
import MetaLine from '@/components/articles/MetaLine';
import { formatTitle, getExcerpt } from '@/lib/textFormat';
import ImageCard from '@/components/home/ImageCard';
import styles from './FeaturedGrid.module.css';

export default function FeaturedGrid({ articles = [] }) {
  // WHY: Limit to 6 cards for above-the-fold content
  // This ensures initial page load is optimized (max 6 images)
  const featuredArticles = articles.slice(0, 6);
  
  if (featuredArticles.length === 0) return null;

  return (
    <section className={styles.featuredGrid}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {featuredArticles.map((article, index) => (
            <article key={article._id || index} className={styles.featuredCard}>
              <Link 
                href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
                className={styles.featuredLink}
              >
                {/* SEO Optimization: Title comes first in HTML for better Google crawling
                    CSS order property will visually position title above image */}
                <h3 className={styles.cardTitle}>{formatTitle(article.title)}</h3>
                <div className={styles.imageWrapper}>
                  {/* LCP Optimization: First card (index 0) uses priority loading
                      - This is the LCP element, so it must load immediately with high priority
                      - Higher quality (80) for better visual quality on LCP element
                      - Optimized sizes for faster loading: larger on desktop for LCP
                      - All other cards lazy-load to reduce initial page weight */}
                  <ImageCard
                    thumbnail={article.thumbnail}
                    image={article.meta?.ogImage}
                    alt={article.title}
                    priority={index === 0}
                    quality={index === 0 ? 80 : 70}
                    sizes={
                      index === 0
                        ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
                    }
                  />
                  {article.categoryKey && (
                    <div className={styles.badgeWrapper}>
                      <CategoryBadge 
                        categoryKey={article.categoryKey}
                        description={article.categoryKey}
                      />
                    </div>
                  )}
                </div>
                <div className={styles.contentWrapper}>
                  <MetaLine
                    updatedAt={article.updatedAt}
                    publishedAt={article.publishedAt}
                    readingTime={article.readingTime}
                    showCategory={false}
                  />
                  {article.meta?.description && (
                    <p className={styles.excerpt}>
                      {getExcerpt(article.meta.description, 15)}
                    </p>
                  )}
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

