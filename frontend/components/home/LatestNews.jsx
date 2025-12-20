import Link from 'next/link';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/imageUtils';
import styles from './LatestNews.module.css';
import { getCategoryColor } from '@/lib/categoryColors';

export default function LatestNews({ articles, categories = [] }) {
  if (!articles || articles.length === 0) return null;

  // Split: 6 small articles for left column, 1 large for right
  const leftArticles = articles.slice(0, 6);
  const rightArticle = articles[6] || null;

  // Category filter options
  const categoryOptions = ['ALL', ...categories.map(cat => 
    (cat.description || cat.categoryKey).toUpperCase()
  )];

  return (
    <section className={styles.latestNews}>
      <div className={styles.container}>
        {/* Header with filters */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Latest News</h2>
          <div className={styles.categoryFilters}>
            {categoryOptions.slice(0, 5).map((category, index) => (
              <button
                key={index}
                className={`${styles.filterButton} ${index === 0 ? styles.active : ''}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grid}>
          {/* Left Column - 6 Small Articles */}
          <div className={styles.leftColumn}>
            {leftArticles.map((article) => (
              <article key={article._id} className={styles.newsArticle}>
                <Link 
                  href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
                  className={styles.articleLink}
                >
                  <div className={styles.articleLayout}>
                    {(() => {
                      const normalizedImage = normalizeImageUrl(article.image);
                      return normalizedImage ? (
                        <div className={styles.imageWrapper}>
                          {/* WHY: Use Next.js Image for optimized images
                              - Lazy-loaded (not priority) since this is below the fold
                              - Fixed height container prevents CLS
                              - Responsive sizing for mobile/desktop */}
                          <Image
                            src={normalizedImage}
                            alt={article.title}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            quality={70}
                            className={styles.articleImage}
                            style={{ objectFit: 'cover' }}
                          />
                          {article.categoryKey && (
                            <span 
                              className={styles.categoryBadge}
                              style={{ backgroundColor: getCategoryColor(article.categoryKey) }}
                            >
                              {(article.categoryKey || '')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className={styles.imagePlaceholder}>
                          {article.categoryKey && (
                            <span 
                              className={styles.categoryBadge}
                              style={{ backgroundColor: getCategoryColor(article.categoryKey) }}
                            >
                              {(article.categoryKey || '')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div className={styles.articleContent}>
                      <h3 className={styles.articleTitle}>{article.title}</h3>
                      <div className={styles.articleMeta}>
                        <span className={styles.byline}>
                          BY {article.meta?.author?.name?.toUpperCase() || 'LavanyaVerse'}
                        </span>
                        {article.updatedAt && (
                          <time className={styles.date}>
                            {new Date(article.updatedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric'
                            }).toUpperCase()}
                          </time>
                        )}
                      </div>
                      {article.meta?.description && (
                        <p className={styles.articleSnippet}>
                          {article.meta.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {/* Right Column - 1 Large Article */}
          {rightArticle && (
            <div className={styles.rightColumn}>
              <article className={styles.largeArticle}>
                <Link 
                  href={rightArticle.categoryKey ? `/${rightArticle.categoryKey}/${rightArticle.slug}` : `/${rightArticle.slug}`}
                  className={styles.articleLink}
                >
                  {(() => {
                    const normalizedImage = normalizeImageUrl(rightArticle.image);
                    return normalizedImage ? (
                      <div className={styles.largeImageWrapper}>
                        {/* WHY: Use Next.js Image for optimized large article image
                            - Lazy-loaded (not priority) since it's in right column
                            - Responsive sizing ensures mobile gets smaller images */}
                        <Image
                          src={normalizedImage}
                          alt={rightArticle.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          quality={75}
                          className={styles.largeImage}
                          style={{ objectFit: 'cover' }}
                        />
                        {rightArticle.categoryKey && (
                          <span 
                            className={styles.largeCategoryBadge}
                            style={{ backgroundColor: getCategoryColor(rightArticle.categoryKey) }}
                          >
                            {(rightArticle.categoryKey || '')
                              .split(' ')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                              .join(' ')}
                          </span>
                        )}
                      </div>
                    ) : (
                    <div className={styles.largeImagePlaceholder}>
                      {rightArticle.categoryKey && (
                        <span 
                          className={styles.largeCategoryBadge}
                          style={{ backgroundColor: getCategoryColor(rightArticle.categoryKey) }}
                        >
                          {(rightArticle.categoryKey || '')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ')}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={styles.largeContent}>
                    <h2 className={styles.largeTitle}>{rightArticle.title}</h2>
                    <div className={styles.largeMeta}>
                      <span className={styles.byline}>
                        BY {rightArticle.meta?.author?.name?.toUpperCase() || 'LavanyaVerse'}
                      </span>
                      {rightArticle.updatedAt && (
                        <time className={styles.date}>
                          {new Date(rightArticle.updatedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric'
                          }).toUpperCase()}
                        </time>
                      )}
                    </div>
                    {rightArticle.meta?.description && (
                      <p className={styles.largeSnippet}>
                        {rightArticle.meta.description}
                      </p>
                    )}
                  </div>
                </Link>
              </article>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

