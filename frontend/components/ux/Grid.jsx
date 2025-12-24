import styles from './ux-components.module.css';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/imageUtils';

/**
 * Grid Component
 * 
 * WHY: Optimized grid images
 * - Lazy-loaded since grids are typically below the fold
 * - Responsive sizing based on grid columns
 */
export default function Grid({ columns = 2, items, ...props }) {
  // Ensure columns is at least 1 and at most 4
  const gridColumns = Math.max(1, Math.min(4, columns || 2));
  
  const gridStyle = {
    gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className={styles.gridSection} {...props}>
      <div className={styles.gridContainer} style={gridStyle}>
        {items.map((item, index) => {
          const normalizedImage = normalizeImageUrl(item.image);
          return (
            <div key={index} className={styles.gridItem}>
              {normalizedImage && (
                <div className={styles.gridItemImage}>
                  {/* WHY: Use Next.js Image for grid items
                      - Lazy-loaded (not priority)
                      - Responsive sizes based on grid layout */}
                  <Image
                    src={normalizedImage}
                    alt={item.title || `Grid item ${index + 1}`}
                    width={600}
                    height={400}
                    sizes={`(max-width: 768px) 100vw, (100vw / ${gridColumns})`}
                    quality={70}
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              )}
              {item.title && <h3 className={styles.gridItemTitle}>{item.title}</h3>}
              {item.text && <p className={styles.gridItemText}>{item.text}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

