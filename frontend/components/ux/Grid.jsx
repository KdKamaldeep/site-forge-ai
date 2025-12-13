import styles from './ux-components.module.css';

export default function Grid({ columns, items, ...props }) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
  };

  return (
    <section className={styles.gridSection} {...props}>
      <div className={styles.gridContainer} style={gridStyle}>
        {items?.map((item, index) => (
          <div key={index} className={styles.gridItem}>
            {item.image && (
              <div className={styles.gridItemImage}>
                <img src={item.image} alt={item.title || ''} />
              </div>
            )}
            {item.title && <h3 className={styles.gridItemTitle}>{item.title}</h3>}
            {item.text && <p className={styles.gridItemText}>{item.text}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

