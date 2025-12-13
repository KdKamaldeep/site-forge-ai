'use client';

import { useState } from 'react';
import styles from './Newsletter.module.css';

export default function Newsletter({ title = "Newsletter", showInSidebar = true }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Subscribe:', email);
    setEmail('');
  };

  if (showInSidebar) {
    return (
      <section className={styles.newsletter}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.scrollButton} aria-label="Scroll up">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        </div>
        <p className={styles.subtitle}>Subscribe for our daily news.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" className={styles.button}>
            Sign Up
          </button>
        </form>
      </section>
    );
  }

  // Full-width newsletter (for homepage sections)
  return (
    <section className={styles.newsletterFull}>
      <div className={styles.fullContainer}>
        <h2 className={styles.fullTitle}>{title}</h2>
        <form onSubmit={handleSubmit} className={styles.fullForm}>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.fullInput}
            required
          />
          <button type="submit" className={styles.fullButton}>
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}

