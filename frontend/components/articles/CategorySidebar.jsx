/**
 * CategorySidebar Component
 * Simplified sidebar for category pages
 */

import PopularPosts from '@/components/home/PopularPosts';
import Categories from '@/components/home/Categories';
import Newsletter from '@/components/home/Newsletter';
import SocialLinks from '@/components/home/SocialLinks';
import styles from './CategorySidebar.module.css';

export default function CategorySidebar({ 
  popularArticles, 
  categories, 
  currentCategory 
}) {
  return (
    <aside className={styles.sidebar}>
      {popularArticles && popularArticles.length > 0 && (
        <section className={styles.sidebarSection}>
          <PopularPosts articles={popularArticles} />
        </section>
      )}
      
      {categories && categories.length > 0 && (
        <section className={styles.sidebarSection}>
          <Categories categories={categories} />
        </section>
      )}
      
      <section className={styles.sidebarSection}>
        <Newsletter showInSidebar={true} />
      </section>
      
      <section className={styles.sidebarSection}>
        <SocialLinks />
      </section>
    </aside>
  );
}

