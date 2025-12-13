import Link from 'next/link';
import styles from './Categories.module.css';

export default function Categories({ categories }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className={styles.categories}>
      <div className={styles.header}>
        <h3 className={styles.title}>Categories</h3>
        <button className={styles.scrollButton} aria-label="Scroll up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
      <ul className={styles.list}>
        {categories.map((category) => (
          <li key={category.categoryKey} className={styles.item}>
            <Link href={`/${category.categoryKey}`} className={styles.link}>
              <span className={styles.categoryName}>
                {(category.description || category.categoryKey)
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ')}
              </span>
              <span className={styles.count}>
                {/* In real app, fetch actual post count */}
                {category.postCount || Math.floor(Math.random() * 10) + 5}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

