import styles from './ux-components.module.css';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/imageUtils';

/**
 * Hero Component
 * 
 * WHY: This is the SINGLE hero image that should use priority loading
 * - priority={true} + fetchPriority="high" for LCP optimization
 * - Only ONE image on the page should have these flags
 * - This ensures the hero image loads first for best LCP score
 */
export default function Hero({ title, subtitle, image, isPriority = false, ...props }) {
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
          {/* WHY: Only set priority=true when this is THE hero image
              - isPriority prop allows parent to control this
              - fetchPriority="high" tells browser to prioritize this image
              - Large sizes for hero image quality */}
          <Image
            src={normalizedImage}
            alt={title || ''}
            width={1920}
            height={1080}

            // 🔑 CRITICAL FIX: clamp hero width
            sizes="(max-width: 768px) 100vw, 900px"

            quality={70}

            priority={isPriority}
            fetchPriority={isPriority ? 'high' : 'auto'}

            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'block',
            }}
          />

        </div>
      )}
    </>
  );
}

