import styles from './ux-components.module.css';
import { normalizeImageUrl } from '@/lib/imageUtils';

export default function Grid({ columns, items, ...props }) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
  };

  return (
    <section className={styles.gridSection} {...props}>
      <div className={styles.gridContainer} style={gridStyle}>
        {items?.map((item, index) => {
          const normalizedImage = normalizeImageUrl(item.image);
          return (
            <div key={index} className={styles.gridItem}>
              {normalizedImage && (
                <div className={styles.gridItemImage}>
                  <img src={normalizedImage} alt={item.title || ''} />
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

