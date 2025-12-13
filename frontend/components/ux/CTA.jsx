import styles from './ux-components.module.css';
import Link from 'next/link';

export default function CTA({ text, link, variant = 'primary', ...props }) {
  // Check if link is external
  const isExternal = link?.startsWith('http://') || link?.startsWith('https://');
  const href = link?.startsWith('/') ? link : `/${link}`;
  
  const className = `${styles.ctaButton} ${styles[`cta${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`;

  if (isExternal) {
    return (
      <div className={styles.ctaSection} {...props}>
        <a href={link} className={className} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      </div>
    );
  }

  return (
    <div className={styles.ctaSection} {...props}>
      <Link href={href} className={className}>
        {text}
      </Link>
    </div>
  );
}

