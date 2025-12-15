import Link from 'next/link';
import { formatTitle } from '@/lib/textFormat';
import { normalizeThumbnail, normalizeImageUrl } from '@/lib/imageUtils';
import styles from './PopularPosts.module.css';

export default function PopularPosts({ articles }) {
  if (!articles || articles.length === 0) return null;
 const filteredArticles = articles.filter(article => {
    if (article.isStandalone === true || article.isStandalone === 'true') return false;
    if (article.standalonePageType) return false;
    return true;
  });
  for (const article of filteredArticles) {
    console.log('article', article.title);
    console.log('article.isStandalone', article.isStandalone);
  }
  return (
    <section className={styles.popularPosts}>
      <div className={styles.header}>
        <h3 className={styles.title}>Popular Posts</h3>
        <button className={styles.scrollButton} aria-label="Scroll up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
      <ul className={styles.list}>
        {filteredArticles.map((article) => (
          <li key={article._id} className={styles.item}>
            <Link 
              href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
              className={styles.link}
            >
              <div className={styles.thumbnail}>
                {(() => {
                  const normalizedThumbnail = normalizeThumbnail(article.thumbnail);
                  const normalizedOgImage = normalizeImageUrl(article.meta?.ogImage);
                  return normalizedThumbnail?.url ? (
                    <img 
                      src={normalizedThumbnail.url} 
                      alt={article.title} 
                      className={styles.thumbnailImage}
                      width={normalizedThumbnail.width || 1200}
                      height={normalizedThumbnail.height || 675}
                    />
                  ) : normalizedOgImage ? (
                    <img src={normalizedOgImage} alt={article.title} className={styles.thumbnailImage} />
                  ) : (
                    <div className={styles.thumbnailPlaceholder}></div>
                  );
                })()}
              </div>
              <div className={styles.content}>
                <h4 className={styles.itemTitle}>{formatTitle(article.title)}</h4>
                {article.updatedAt && (
                  <time className={styles.itemMeta}>
                    {new Date(article.updatedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric'
                    })}
                  </time>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

