/**
 * FeaturedArticle Component
 * Text-first featured article with editorial styling
 */

import Link from 'next/link';
import CategoryBadge from '@/components/articles/CategoryBadge';
import MetaLine from '@/components/articles/MetaLine';
import { formatTitle, getExcerpt } from '@/lib/textFormat';
import styles from './FeaturedArticle.module.css';

export default function FeaturedArticle({ article }) {
  if (!article) return null;

  const excerpt = article.meta?.description ? getExcerpt(article.meta.description, 25) : null;

  const articleUrl = article.categoryKey 
    ? `/${article.categoryKey}/${article.slug}`
    : `/${article.slug}`;

  return (
    <section className={styles.featuredSection}>
      <div className={styles.container}>
        <article className={styles.featuredArticle}>
          <Link href={articleUrl} className={styles.featuredLink}>
            <div className={styles.featuredHeader}>
              {article.categoryKey && (
                <>
                  <CategoryBadge 
                    categoryKey={article.categoryKey} 
                    description={article.categoryKey}
                  />
                  <span className={styles.separator}>·</span>
                </>
              )}
              <MetaLine
                updatedAt={article.updatedAt}
                publishedAt={article.publishedAt}
                readingTime={article.readingTime}
                showCategory={false}
              />
            </div>
            <h1 className={styles.featuredTitle}>{formatTitle(article.title)}</h1>
            {excerpt && (
              <p className={styles.featuredExcerpt}>{excerpt}</p>
            )}
          </Link>
        </article>
      </div>
    </section>
  );
}

