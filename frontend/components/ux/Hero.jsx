import styles from './ux-components.module.css';
import { normalizeImageUrl } from '@/lib/imageUtils';

export default function Hero({ title, subtitle, image, ...props }) {
  const normalizedImage = normalizeImageUrl(image);
  
  return (
    <>
      <section className={styles.hero} {...props}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{title}</h1>
            {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}
          </div>
        </div>
      </section>
      {normalizedImage && (
        <div className={styles.heroFeatureImage}>
          <img src={normalizedImage} alt={title || ''} />
        </div>
      )}
    </>
  );
}

