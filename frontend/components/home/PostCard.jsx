/**
 * PostCard Component
 * Card for 2-column grid layout with image, title, meta, excerpt
 */

import Link from 'next/link';
import CategoryBadge from '@/components/articles/CategoryBadge';
import MetaLine from '@/components/articles/MetaLine';
import { formatTitle, getExcerpt } from '@/lib/textFormat';
import styles from './PostCard.module.css';

export default function PostCard({ article }) {
  if (!article) return null;

  const excerpt = article.meta?.description ? getExcerpt(article.meta.description, 18) : null;

  const articleUrl = article.categoryKey 
    ? `/${article.categoryKey}/${article.slug}`
    : `/${article.slug}`;

  return (
    <article className={styles.postCard}>
      <Link href={articleUrl} className={styles.cardLink}>
        <div className={styles.imageWrapper}>
          {article.meta?.ogImage ? (
            <img 
              src={article.meta.ogImage} 
              alt={article.title}
              className={styles.cardImage}
            />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
          {article.categoryKey && (
            <div className={styles.badgeWrapper}>
              <CategoryBadge 
                categoryKey={article.categoryKey}
                description={article.categoryKey}
              />
            </div>
          )}
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{formatTitle(article.title)}</h3>
          <MetaLine
            updatedAt={article.updatedAt}
            publishedAt={article.publishedAt}
            readingTime={article.readingTime}
            showCategory={false}
          />
          {excerpt && (
            <p className={styles.cardExcerpt}>{excerpt}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

