import styles from './ux-components.module.css';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/imageUtils';

/**
 * Paragraph Component
 * 
 * Supports two layouts:
 * 1. Legacy: Just text content (backward compatible)
 * 2. New (layout_type === "NEW"): Title → Image → Content
 */
export default function Paragraph({ text, image, title, layout_type, ...props }) {
  const normalizedImage = normalizeImageUrl(image);
  
  // Check if this is the new layout format
  const isNewLayout = layout_type === 'NEW' || (title && normalizedImage);
  
  return (
    <div className={styles.paragraph} {...props}>
      {isNewLayout ? (
        <>
          {/* New Layout: Title → Image → Content */}
          {title && (
            <h2 className={styles.paragraphTitle}>{title}</h2>
          )}
          {normalizedImage && (
            <figure className={styles.paragraphImageBlock}>
              <div className={styles.paragraphImageWrapper}>
                <Image
                  src={normalizedImage}
                  alt={title || ''}
                  width={1000}
                  height={600}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1000px"
                  quality={75}
                  className={styles.paragraphImage}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </div>
            </figure>
          )}
          <div dangerouslySetInnerHTML={{ __html: text }} />
        </>
      ) : (
        // Legacy Layout: Just content (backward compatible)
        <div dangerouslySetInnerHTML={{ __html: text }} />
      )}
    </div>
  );
}

