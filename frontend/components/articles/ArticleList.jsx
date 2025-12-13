/**
 * ArticleList Component
 * Container for article list items
 */

import ArticleListItem from './ArticleListItem';
import styles from './ArticleList.module.css';

export default function ArticleList({ pages, categoryKey, categoryDescription }) {
  if (!pages || pages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No articles yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className={styles.articleList}>
      {pages.map((page) => (
        <ArticleListItem
          key={page._id}
          page={page}
          categoryKey={categoryKey || page.categoryKey}
          categoryDescription={categoryDescription || null}
        />
      ))}
    </div>
  );
}

