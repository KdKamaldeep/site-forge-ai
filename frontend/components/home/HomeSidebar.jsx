/**
 * HomeSidebar Component
 * Sidebar for homepage with popular posts, newsletter, social
 */

import PopularPosts from './PopularPosts';
import Newsletter from './Newsletter';
import SocialLinks from './SocialLinks';
import Categories from './Categories';
import styles from './HomeSidebar.module.css';

export default function HomeSidebar({ 
  popularArticles = [], 
  categories = [] 
}) {
  return (
    <aside className={styles.sidebar}>
      {popularArticles.length > 0 && (
        <div className={styles.sidebarCard}>
          <PopularPosts articles={popularArticles} />
        </div>
      )}

      {categories.length > 0 && (
        <div className={styles.sidebarCard}>
          <Categories categories={categories} />
        </div>
      )}

      <div className={styles.sidebarCard}>
        <Newsletter showInSidebar={true} />
      </div>

      <div className={styles.sidebarCard}>
        <SocialLinks />
      </div>
    </aside>
  );
}

