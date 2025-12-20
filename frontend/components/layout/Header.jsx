'use client';

/**
 * Editorial Blog Header Component
 * Logo + Navigation with categories/pillars
 */

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './Header.module.css';

export default function Header({ navigation, tenant }) {
  const [isScrolled, setIsScrolled] = useState(false);
  
  const navItems = Array.isArray(navigation) ? navigation : [];
  const categories = tenant?.contentPillars || [];
  
  // Use navigation items if available, otherwise use categories as nav
  // CLS Prevention: Always compute navLinks to prevent conditional rendering layout shift
  const navLinks = navItems.length > 0 
    ? navItems.sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8)
    : categories.slice(0, 8).map(cat => ({
        label: cat.description || cat.categoryKey,
        path: `/${cat.categoryKey}`,
        categoryKey: cat.categoryKey
      }));
  
  const brandName = tenant?.brandIdentity?.brandName || tenant?.name || 'Site';
  const logo = tenant?.logo || null;
  const formattedBrandName = brandName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  // CLS Prevention: Always render at least placeholder nav items to reserve space
  const displayNavLinks = navLinks.length > 0 ? navLinks.slice(0, 5) : [];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`${styles.mainHeader} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerWrapper}>
        <div className={styles.headerContent}>
          {/* Left: Logo */}
          {/* CLS Prevention: Always render logo container to reserve space */}
          <Link href="/" className={styles.headerLogo}>
            {logo ? (
              <Image 
                src={logo} 
                alt={brandName} 
                className={styles.logoImage}
                width={40}
                height={40}
                priority
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <span className={styles.logoText}>{formattedBrandName}</span>
            )}
          </Link>

          {/* Center: Navigation */}
          {/* CLS Prevention: Always render nav container to reserve space */}
          <nav className={styles.mainNav}>
            <div className={styles.navContent}>
              {displayNavLinks.length > 0 ? (
                displayNavLinks.map((item, index) => (
                  <Link
                    key={item.categoryKey || item.path || index}
                    href={item.path || `/${item.categoryKey}`}
                    className={styles.navLink}
                  >
                    {item.label || item.categoryKey}
                  </Link>
                ))
              ) : (
                // CLS Prevention: Render placeholder to maintain layout
                <div style={{ visibility: 'hidden', height: '1.5em' }} aria-hidden="true">
                  <span className={styles.navLink}>Navigation</span>
                </div>
              )}
            </div>
          </nav>

          {/* Right: Search */}
          <button className={styles.navSearch} aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
