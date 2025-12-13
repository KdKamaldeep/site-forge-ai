/**
 * ArticleListItem Component
 * Clean editorial-style article preview
 */

import Link from 'next/link';
import MetaLine from './MetaLine';
import { formatTitle, getExcerpt } from '@/lib/textFormat';
import styles from './ArticleListItem.module.css';

export default function ArticleListItem({ 
  page, 
  categoryKey,
  categoryDescription 
}) {
  const excerpt = page.meta?.description ? getExcerpt(page.meta.description, 20) : null;

  // Use page.categoryKey if categoryKey prop is not provided
  const finalCategoryKey = categoryKey || page.categoryKey;
  const finalCategoryDescription = categoryDescription || null;

  return (
    <article className={styles.articleItem}>
      <Link 
        href={finalCategoryKey ? `/${finalCategoryKey}/${page.slug}` : `/${page.slug}`} 
        className={styles.articleLink}
      >
        <MetaLine
          updatedAt={page.updatedAt}
          publishedAt={page.publishedAt}
          readingTime={page.readingTime}
          showCategory={!!finalCategoryKey}
          categoryKey={finalCategoryKey}
          categoryDescription={finalCategoryDescription}
        />
        <h2 className={styles.articleTitle}>{formatTitle(page.title)}</h2>
        {excerpt && (
          <p className={styles.articleExcerpt}>{excerpt}</p>
        )}
      </Link>
    </article>
  );
}

