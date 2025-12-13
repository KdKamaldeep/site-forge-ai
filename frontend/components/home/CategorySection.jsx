/**
 * CategorySection Component
 * Simple text-based category section with latest articles
 */

import Link from 'next/link';
import MetaLine from '@/components/articles/MetaLine';
import { formatTitle } from '@/lib/textFormat';
import styles from './CategorySection.module.css';

export default function CategorySection({ category, articles, maxArticles = 3 }) {
  if (!category || !articles || articles.length === 0) return null;

  const categoryArticles = articles.slice(0, maxArticles);
  const categoryDescription = category.description || category.categoryKey;

  return (
    <section className={styles.categorySection}>
      <div className={styles.categoryHeader}>
        <h2 className={styles.categoryTitle}>
          <Link href={`/${category.categoryKey}`} className={styles.categoryLink}>
            {categoryDescription}
          </Link>
        </h2>
        <Link href={`/${category.categoryKey}`} className={styles.viewAllLink}>
          View all
        </Link>
      </div>
      
      <ul className={styles.articlesList}>
        {categoryArticles.map((article) => (
          <li key={article._id} className={styles.articleItem}>
            <Link 
              href={`/${category.categoryKey}/${article.slug}`}
              className={styles.articleLink}
            >
              <h3 className={styles.articleTitle}>{formatTitle(article.title)}</h3>
              <MetaLine
                updatedAt={article.updatedAt}
                publishedAt={article.publishedAt}
                readingTime={article.readingTime}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

