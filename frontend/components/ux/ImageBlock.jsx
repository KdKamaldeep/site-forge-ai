import styles from './ux-components.module.css';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/imageUtils';

/**
 * ImageBlock Component
 * 
 * WHY: Optimized image display for article content
 * - Uses Next.js Image for automatic optimization
 * - Lazy-loaded by default (not above-the-fold)
 * - Maintains aspect ratio to prevent CLS
 */
export default function ImageBlock({ image, caption, ...props }) {
  const normalizedImage = normalizeImageUrl(image);
  if (!normalizedImage) return null;
  
  return (
    <figure className={styles.imageBlock} {...props}>
      {/* WHY: Use Next.js Image for automatic WebP/AVIF conversion
          - Lazy-loaded since it's in article content (below fold)
          - Responsive sizing ensures mobile gets smaller images */}
      <div className={styles.imageBlockWrapper}>
        <Image
          src={normalizedImage}
          alt={caption || ''}
          width={1000}
          height={600}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1000px"
          quality={75}
          className={styles.imageBlockImg}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        />
      </div>
      {caption && <figcaption className={styles.imageCaption}>{caption}</figcaption>}
    </figure>
  );
}

