/**
 * RelatedPages Component
 * Displays a list of related pages with links
 */

import styles from './ux-components.module.css';
import Link from 'next/link';
import { formatTitle } from '@/lib/textFormat';

export default function RelatedPages({ title = 'Related Articles', items = [] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className={styles.relatedPagesSection}>
      <h2 className={styles.relatedPagesTitle}>{title}</h2>
      <div className={styles.relatedPagesList}>
        {items.map((item, index) => {
          // Use href if provided, otherwise construct from category and slug
          let href = item.href || '';
          if (!href && item.categoryKey && item.slug) {
            href = `/${item.categoryKey}/${item.slug}`;
          } else if (!href && item.slug) {
            href = `/${item.slug}`;
          }
          
          if (!href || !href.startsWith('/')) {
            href = href ? `/${href}` : '';
          }
          
          const pageTitle = item.title || '';
          
          if (!href || !pageTitle) {
            return null;
          }

          return (
            <div key={index} className={styles.relatedPageItem}>
              <Link href={href} className={styles.relatedPageLink}>
                {formatTitle(pageTitle)}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
