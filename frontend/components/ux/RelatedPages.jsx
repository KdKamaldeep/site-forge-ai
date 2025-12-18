/**
 * RelatedPages Component
 * Displays a list of related pages with links
 */

import styles from './ux-components.module.css';
import Link from 'next/link';

export default function RelatedPages({ title = 'Related Articles', items = [] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className={styles.relatedPagesSection}>
      {title && <h2 className={styles.relatedPagesTitle}>{title}</h2>}
      <div className={styles.relatedPagesList}>
        {items.map((item, index) => {
          // Extract slug from href if it's a string, or use item.slug
          let href = item.href || item.slug || '';
          if (href && !href.startsWith('/')) {
            href = `/${href}`;
          }
          
          const pageTitle = item.title || '';
          
          if (!href || !pageTitle) {
            return null;
          }

          return (
            <div key={index} className={styles.relatedPageItem}>
              <Link href={href} className={styles.relatedPageLink}>
                {pageTitle}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
