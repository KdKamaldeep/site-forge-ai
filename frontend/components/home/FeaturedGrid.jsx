/**
 * FeaturedGrid Component
 * Hero section with 6 small featured article cards in a grid
 */

import Link from 'next/link';
import CategoryBadge from '@/components/articles/CategoryBadge';
import MetaLine from '@/components/articles/MetaLine';
import { formatTitle, getExcerpt } from '@/lib/textFormat';
import { normalizeThumbnail, normalizeImageUrl } from '@/lib/imageUtils';
import styles from './FeaturedGrid.module.css';

export default function FeaturedGrid({ articles = [] }) {
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
                <div className={styles.imageWrapper}>
                  {(() => {
                    const normalizedThumbnail = normalizeThumbnail(article.thumbnail);
                    const normalizedOgImage = normalizeImageUrl(article.meta?.ogImage);
                    return normalizedThumbnail?.url ? (
                      <img 
                        src={normalizedThumbnail.url} 
                        alt={article.title}
                        className={styles.featuredImage}
                        width={normalizedThumbnail.width || 1200}
                        height={normalizedThumbnail.height || 675}
                      />
                    ) : normalizedOgImage ? (
                      <img 
                        src={normalizedOgImage} 
                        alt={article.title}
                        className={styles.featuredImage}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder} />
                    );
                  })()}
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
                  <h3 className={styles.cardTitle}>{formatTitle(article.title)}</h3>
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

