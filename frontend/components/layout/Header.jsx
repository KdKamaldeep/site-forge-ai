'use client';

/**
 * Editorial Blog Header Component
 * Logo + Navigation with categories/pillars
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './Header.module.css';

export default function Header({ navigation, tenant }) {
  const [isScrolled, setIsScrolled] = useState(false);
  
  const navItems = Array.isArray(navigation) ? navigation : [];
  const categories = tenant?.contentPillars || [];
  
  // Use navigation items if available, otherwise use categories as nav
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
          <Link href="/" className={styles.headerLogo}>
            {logo && (
              <img src={logo} alt={brandName} className={styles.logoImage} />
            )}
            <span className={styles.logoText}>{formattedBrandName}</span>
          </Link>

          {/* Center: Navigation */}
          <nav className={styles.mainNav}>
            <div className={styles.navContent}>
              {navLinks.slice(0, 5).map((item, index) => (
                <Link
                  key={item.categoryKey || item.path || index}
                  href={item.path || `/${item.categoryKey}`}
                  className={styles.navLink}
                >
                  {item.label || item.categoryKey}
                </Link>
              ))}
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
