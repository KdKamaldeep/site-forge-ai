import styles from './ux-components.module.css';

export default function FeatureList({ items, ...props }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className={styles.featureList} {...props}>
      <ul className={styles.featureListItems}>
        {items.map((item, index) => (
          <li key={index} className={styles.featureItem}>
            {item.title && <h3 className={styles.featureTitle}>{item.title}</h3>}
            {item.description && <p className={styles.featureDescription}>{item.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

