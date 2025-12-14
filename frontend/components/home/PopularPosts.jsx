import Link from 'next/link';
import { formatTitle } from '@/lib/textFormat';
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
                {article.thumbnail?.url ? (
                  <img 
                    src={article.thumbnail.url} 
                    alt={article.title} 
                    className={styles.thumbnailImage}
                    width={article.thumbnail.width || 1200}
                    height={article.thumbnail.height || 675}
                  />
                ) : article.meta?.ogImage ? (
                  <img src={article.meta.ogImage} alt={article.title} className={styles.thumbnailImage} />
                ) : (
                  <div className={styles.thumbnailPlaceholder}></div>
                )}
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

