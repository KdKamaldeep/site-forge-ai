import styles from './ux-components.module.css';

const variantStyles = {
  info: { bg: '#e3f2fd', border: '#2196f3', icon: 'ℹ️' },
  warning: { bg: '#fff3e0', border: '#ff9800', icon: '⚠️' },
  success: { bg: '#e8f5e9', border: '#4caf50', icon: '✅' },
};

export default function InfoBox({ title, text, variant = 'info', ...props }) {
  const colors = variantStyles[variant] || variantStyles.info;

  return (
    <div
      className={styles.infoBox}
      style={{ background: colors.bg, borderLeft: `4px solid ${colors.border}` }}
      {...props}
    >
      <div className={styles.infoBoxContent}>
        <h3 className={styles.infoBoxTitle}>
          <span className={styles.infoBoxIcon}>{colors.icon}</span>
          {title}
        </h3>
        <p className={styles.infoBoxText}>{text}</p>
      </div>
    </div>
  );
}

