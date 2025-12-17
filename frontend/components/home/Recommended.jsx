import Link from 'next/link';
import styles from './Recommended.module.css';

export default function Recommended({ articles }) {
  if (!articles || articles.length === 0) return null;

  const renderStars = (rating = 0) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < rating ? '#fbbf24' : '#e5e7eb'}
          stroke={i < rating ? '#fbbf24' : '#e5e7eb'}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    }
    return stars;
  };

  return (
    <section className={styles.recommended}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recommended</h3>
        <button className={styles.scrollButton} aria-label="Scroll up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
      <div className={styles.list}>
        {articles.map((article) => (
          <article key={article._id} className={styles.item}>
            <Link 
              href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
              className={styles.link}
            >
              <div className={styles.imageWrapper}>
                {article.image ? (
                  <img src={article.image} alt={article.title} className={styles.image} />
                ) : (
                  <div className={styles.imagePlaceholder}></div>
                )}
              </div>
              <div className={styles.content}>
                <h4 className={styles.title}>{article.title}</h4>
                <div className={styles.meta}>
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
                <div className={styles.rating}>
                  {renderStars(article.rating || Math.floor(Math.random() * 3) + 2)}
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

