/**
 * FAQ Component
 * Displays a list of frequently asked questions and answers
 */

import styles from './ux-components.module.css';

export default function FAQ({ title = 'Frequently Asked Questions', items = [] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className={styles.faqSection}>
      {title && <h2 className={styles.faqTitle}>{title}</h2>}
      <div className={styles.faqList}>
        {items.map((item, index) => (
          <div key={index} className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>{item.question}</h3>
            <div 
              className={styles.faqAnswer}
              dangerouslySetInnerHTML={{ __html: item.answer }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

