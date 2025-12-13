'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './NewsFlash.module.css';

export default function NewsFlash({ newsItems = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Default news flash items if none provided
  const defaultItems = [
    'Satellite cost tens of millions or even hundreds of millions of dollars to build',
    'Latest technology trends reshaping the digital landscape',
    'Global markets respond to new economic policies',
  ];

  const items = newsItems.length > 0 ? newsItems : defaultItems;
  const currentItem = items[currentIndex] || items[0];

  // Auto-rotate news items
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, items.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div 
      className={styles.newsFlash}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.newsFlashContent}>
        <Link href="/newsflash" className={styles.newsFlashButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          NewsFlash
        </Link>
        <p className={styles.newsFlashText}>{currentItem}</p>
        {items.length > 1 && (
          <div className={styles.newsFlashControls}>
            <button 
              className={styles.controlButton}
              onClick={handlePrev}
              aria-label="Previous news"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M7.5 9L4.5 6l3-3"/>
              </svg>
            </button>
            <button 
              className={styles.controlButton}
              onClick={handleNext}
              aria-label="Next news"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4.5 3L7.5 6l-3 3"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

