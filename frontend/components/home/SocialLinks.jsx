import styles from './SocialLinks.module.css';

export default function SocialLinks() {
  const socialPlatforms = [
    { name: 'Facebook', icon: 'f', color: '#1877f2' },
    { name: 'Google+', icon: 'G+', color: '#db4437' },
    { name: 'Twitter', icon: '🐦', color: '#1da1f2' },
    { name: 'Instagram', icon: '📷', color: '#e4405f' },
    { name: 'Youtube', icon: '▶', color: '#ff0000' },
    { name: 'RSS', icon: 'ツ', color: '#ffa500' },
  ];

  return (
    <section className={styles.socialLinks}>
      <div className={styles.header}>
        <h3 className={styles.title}>Let&apos;s Hang Out On Social</h3>
        <button className={styles.scrollButton} aria-label="Scroll up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
      <div className={styles.grid}>
        {socialPlatforms.map((platform) => (
          <a
            key={platform.name}
            href="#"
            className={styles.socialButton}
            style={{ backgroundColor: platform.color }}
            aria-label={platform.name}
            title={platform.name}
          >
            {platform.icon}
          </a>
        ))}
      </div>
    </section>
  );
}

