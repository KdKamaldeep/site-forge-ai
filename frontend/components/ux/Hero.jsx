import styles from './ux-components.module.css';

export default function Hero({ title, subtitle, image, ...props }) {
  return (
    <section className={styles.hero} {...props}>
      <div className={styles.heroContainer}>
        {image && (
          <div className={styles.heroImage}>
            <img src={image} alt={title} />
          </div>
        )}
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{title}</h1>
          {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}
        </div>
      </div>
    </section>
  );
}

