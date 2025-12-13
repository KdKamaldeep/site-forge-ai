/**
 * CategoryBadge Component
 * Small, muted text-only badge for categories
 */

import styles from './CategoryBadge.module.css';

export default function CategoryBadge({ categoryKey, description }) {
  const label = description || categoryKey || '';
  const formattedLabel = label.toUpperCase();

  return (
    <span className={styles.categoryBadge}>
      {formattedLabel}
    </span>
  );
}

