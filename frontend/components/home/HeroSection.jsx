import Link from 'next/link';
import styles from './HeroSection.module.css';

export default function HeroSection({ featuredArticle }) {
  if (!featuredArticle) return null;

  return (
    <section className={styles.heroSection}>
      <div className={styles.heroImageWrapper}>
        {/* Placeholder for hero image - in real app, use featuredArticle.image */}
        <div className={styles.heroImage}>
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                {featuredArticle.title}
              </h1>
              {featuredArticle.meta?.description && (
                <p className={styles.heroDescription}>
                  {featuredArticle.meta.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

