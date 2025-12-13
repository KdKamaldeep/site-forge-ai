import Link from 'next/link';
import styles from './CategoryList.module.css';

export default function CategoryList({ categories, activeCategory }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className={styles.categoryList}>
      <div className={styles.container}>
        <ul className={styles.list}>
          {categories.map((category) => {
            const isActive = activeCategory === category.categoryKey;
            return (
              <li key={category.categoryKey} className={styles.item}>
                <Link 
                  href={`/${category.categoryKey}`}
                  className={`${styles.link} ${isActive ? styles.active : ''}`}
                >
                  <span className={styles.name}>
                    {(category.description || category.categoryKey)
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')}
                  </span>
                  <span className={styles.count}>
                    {/* In real app, fetch actual post count */}
                    {category.postCount || '0'} Posts
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

