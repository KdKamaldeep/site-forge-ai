import styles from './ux-components.module.css';

export default function Paragraph({ text, ...props }) {
  return (
    <div className={styles.paragraph} {...props}>
      <div dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

