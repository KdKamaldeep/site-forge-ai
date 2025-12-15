/**
 * EditorsPicksSection Component
 * Section with list/grid layout for editor picks
 */

import Link from 'next/link';
import CategoryBadge from '@/components/articles/CategoryBadge';
import MetaLine from '@/components/articles/MetaLine';
import { formatTitle, getExcerpt } from '@/lib/textFormat';
import { normalizeThumbnail, normalizeImageUrl } from '@/lib/imageUtils';
import styles from './EditorsPicksSection.module.css';

export default function EditorsPicksSection({ articles = [], title = "Editor's Picks" }) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className={styles.editorsPicks}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.articlesList}>
          {articles.map((article) => {
            const articleUrl = article.categoryKey 
              ? `/${article.categoryKey}/${article.slug}`
              : `/${article.slug}`;

            return (
              <article key={article._id} className={styles.articleItem}>
                <Link href={articleUrl} className={styles.articleLink}>
                  <div className={styles.articleLayout}>
                    {/* Image */}
                    <div className={styles.imageWrapper}>
                      {(() => {
                        const normalizedThumbnail = normalizeThumbnail(article.thumbnail);
                        const normalizedOgImage = normalizeImageUrl(article.meta?.ogImage);
                        return normalizedThumbnail?.url ? (
                          <img 
                            src={normalizedThumbnail.url} 
                            alt={article.title}
                            className={styles.articleImage}
                            width={normalizedThumbnail.width || 1200}
                            height={normalizedThumbnail.height || 675}
                          />
                        ) : normalizedOgImage ? (
                          <img 
                            src={normalizedOgImage} 
                            alt={article.title}
                            className={styles.articleImage}
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

                    {/* Content */}
                    <div className={styles.articleContent}>
                      <h3 className={styles.articleTitle}>{formatTitle(article.title)}</h3>
                      <MetaLine
                        updatedAt={article.updatedAt}
                        publishedAt={article.publishedAt}
                        readingTime={article.readingTime}
                        showCategory={false}
                      />
                      {article.meta?.description && (
                        <p className={styles.articleExcerpt}>
                          {getExcerpt(article.meta.description, 25)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

