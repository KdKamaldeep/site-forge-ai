/**
 * MetaLine Component
 * Displays article metadata (date, reading time)
 */

import styles from './MetaLine.module.css';
import CategoryBadge from './CategoryBadge';

export default function MetaLine({ 
  updatedAt, 
  publishedAt, 
  readingTime,
  showCategory = false,
  categoryKey = null,
  categoryDescription = null 
}) {
  // Prefer publishedAt over updatedAt for display (preserves original publication date)
  // Only use updatedAt if publishedAt is not available
  const date = publishedAt || updatedAt;
  const formattedDate = date 
    ? new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : null;

  return (
    <div className={styles.metaLine}>
      {showCategory && categoryKey && (
        <>
          <CategoryBadge categoryKey={categoryKey} description={categoryDescription} />
          <span className={styles.separator}>·</span>
        </>
      )}
      {formattedDate && <time>{formattedDate}</time>}
      {readingTime && formattedDate && <span className={styles.separator}>·</span>}
      {readingTime && <span>{readingTime} min read</span>}
    </div>
  );
}

