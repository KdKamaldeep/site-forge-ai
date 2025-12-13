import PopularPosts from './PopularPosts';
import Newsletter from './Newsletter';
import SocialLinks from './SocialLinks';
import Categories from './Categories';
import Recommended from './Recommended';
import styles from './Sidebar.module.css';

export default function Sidebar({ 
  popularArticles, 
  categories, 
  recommendedArticles 
}) {
  return (
    <aside className={styles.sidebar}>
      {popularArticles && popularArticles.length > 0 && (
        <PopularPosts articles={popularArticles} />
      )}
      <Newsletter />
      <SocialLinks />
      {categories && categories.length > 0 && (
        <Categories categories={categories} />
      )}
      {recommendedArticles && recommendedArticles.length > 0 && (
        <Recommended articles={recommendedArticles} />
      )}
    </aside>
  );
}

