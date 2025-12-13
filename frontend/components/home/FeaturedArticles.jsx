import Link from 'next/link';
import styles from './FeaturedArticles.module.css';
import { getCategoryColor } from '@/lib/categoryColors';

export default function FeaturedArticles({ articles }) {
  if (!articles || articles.length === 0) return null;

  // Split: 6 small articles for left column, 1 large for right
  const leftArticles = articles.slice(0, 6);
  const rightArticle = articles[6] || null;

  return (
    <section className={styles.featuredArticles}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Left Column - 6 Small Articles */}
          <div className={styles.leftColumn}>
            {leftArticles.map((article) => (
              <article key={article._id} className={styles.smallArticle}>
                <Link 
                  href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
                  className={styles.articleLink}
                >
                  <div className={styles.articleLayout}>
                    {article.image ? (
                      <div className={styles.imageWrapper}>
                        <img 
                          src={article.image} 
                          alt={article.title}
                          className={styles.articleImage}
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
                    )}
                    <div className={styles.articleContent}>
                      <h3 className={styles.articleTitle}>{article.title}</h3>
                      <div className={styles.articleMeta}>
                        <span className={styles.byline}>
                          BY {article.meta?.author?.name?.toUpperCase() || 'DEOTHEMES'}
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
                  {rightArticle.image ? (
                    <div className={styles.largeImageWrapper}>
                      <img 
                        src={rightArticle.image} 
                        alt={rightArticle.title}
                        className={styles.largeImage}
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
                        BY {rightArticle.meta?.author?.name?.toUpperCase() || 'DEOTHEMES'}
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

