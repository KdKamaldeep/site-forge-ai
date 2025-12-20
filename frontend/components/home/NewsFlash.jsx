'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './NewsFlash.module.css';

// CLS Prevention: Fixed fallback text ensures stable SSR/hydration height
const FALLBACK_TEXT = 'Latest news and updates';

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
  // CLS Prevention: Use first item immediately to prevent text change on mount
  const currentItem = items[currentIndex] || items[0] || FALLBACK_TEXT;

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

  // CLS Prevention: Always render controls container to reserve space (prevents layout shift when items.length changes)
  const hasMultipleItems = items.length > 1;

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
        {/* CLS Prevention: Fixed line-height and no-wrap prevent text reflow */}
        <p className={styles.newsFlashText}>{currentItem}</p>
        {/* CLS Prevention: Always render controls container (hidden when not needed) to prevent layout shift */}
       
      </div>
    </div>
  );
}

