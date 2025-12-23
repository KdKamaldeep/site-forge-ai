import Link from 'next/link';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/imageUtils';
import styles from './EditorPicks.module.css';
import { getCategoryColor } from '@/lib/categoryColors';

export default function EditorPicks({ articles, title = "Editor Pick's" }) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className={styles.editorPicks}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.navControls}>
            <button className={styles.navButton} aria-label="Previous">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className={styles.navButton} aria-label="Next">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button className={styles.scrollButton} aria-label="Scroll up">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.articlesList}>
          {articles.map((article) => (
            <article key={article._id} className={styles.article}>
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
                            - Lazy-loaded (not priority) since this is in sidebar/below fold */}
                        <Image
                          src={normalizedImage}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
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
                      {(article.publishedAt || article.updatedAt) && (
                        <time className={styles.date}>
                          {new Date(article.publishedAt || article.updatedAt).toLocaleDateString('en-US', { 
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
      </div>
    </section>
  );
}

