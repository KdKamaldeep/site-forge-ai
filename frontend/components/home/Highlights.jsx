import Link from 'next/link';
import styles from './Highlights.module.css';

export default function Highlights({ articles, title = "Highlights", layout = 'horizontal' }) {
  if (!articles || articles.length === 0) return null;

  const isTwoColumn = layout === 'two-column';
  const mainArticles = isTwoColumn ? articles.slice(0, 4) : articles.slice(0, 4);
  const relatedArticles = isTwoColumn ? articles.slice(4, 9) : null;

  return (
    <section className={styles.highlights}>
      <div className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        
        {isTwoColumn ? (
          <div className={styles.twoColumnLayout}>
            {/* Left Column - Main Articles */}
            <div className={styles.mainColumn}>
              {mainArticles.map((article) => (
                <article key={article._id} className={styles.article}>
                  <Link 
                    href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
                    className={styles.articleLink}
                  >
                    <div className={styles.imageWrapper}>
                      <div className={styles.articleImage}></div>
                    </div>
                    <h3 className={styles.articleTitle}>{article.title}</h3>
                  </Link>
                </article>
              ))}
            </div>

            {/* Right Column - Related Articles */}
            {relatedArticles && (
              <div className={styles.relatedColumn}>
                <h3 className={styles.relatedTitle}>Relatest</h3>
                {relatedArticles.map((article) => (
                  <article key={article._id} className={styles.relatedArticle}>
                    <Link 
                      href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
                      className={styles.relatedLink}
                    >
                      <div className={styles.relatedImageWrapper}>
                        <div className={styles.relatedImage}></div>
                      </div>
                      <h4 className={styles.relatedTitle}>{article.title}</h4>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.horizontalLayout}>
            {mainArticles.map((article) => (
              <article key={article._id} className={styles.horizontalArticle}>
                <Link 
                  href={article.categoryKey ? `/${article.categoryKey}/${article.slug}` : `/${article.slug}`}
                  className={styles.articleLink}
                >
                  <div className={styles.horizontalImageWrapper}>
                    <div className={styles.horizontalImage}></div>
                  </div>
                  <h3 className={styles.horizontalTitle}>{article.title}</h3>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

