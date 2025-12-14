'use client';

/**
 * Simple Standalone Page Layout Component
 * Clean, simple layout for Privacy Policy, About Us, Contact, Cookie Disclosure pages
 */

import styles from './StandalonePageLayout.module.css';

export default function StandalonePageLayout({ 
  content, 
  title,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
        </header>
        
        <main className={styles.content}>
          <div 
            className={styles.contentBody}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </main>
      </div>
    </div>
  );
}
