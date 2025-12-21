'use client';

/**
 * Editorial Article Layout Component
 * Clean, readable article layout with breadcrumbs, TOC, and related articles
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatTitle } from '@/lib/textFormat';
import { normalizeThumbnail, normalizeImageUrl } from '@/lib/imageUtils';
import styles from './ArticleLayout.module.css';

export default function ArticleLayout({ 
  content, 
  title, 
  meta, 
  readingTime, 
  wordCount,
  categoryKey,
  updatedAt,
  publishedAt,
  intent,
  monetizationMode,
  thumbnail,
  isStandalone,
  adsenseId,
}) {
  const contentRef = useRef(null);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState('');

  // Generate table of contents from H2/H3 headings
  useEffect(() => {
    if (!contentRef.current) return;

    const headings = contentRef.current.querySelectorAll('h2, h3');
    const tocItems = [];
    
    headings.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`;
      if (!heading.id) {
        heading.id = id;
      }
      
      const level = heading.tagName.toLowerCase();
      tocItems.push({
        id,
        text: heading.textContent || '',
        level: level === 'h2' ? 2 : 3,
      });
    });
    
    setToc(tocItems);

      // Process content images
    const images = contentRef.current.querySelectorAll('img');
    images.forEach(img => {
      if (!img.classList.contains('content-image')) {
        img.classList.add('content-image');
      }
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
    });

    // Process monetization placeholders - replace with React components (skip if monetizationMode is 'none')
    if (monetizationMode !== 'none') {
      const adSlots = contentRef.current.querySelectorAll('[data-ad-slot]');
      adSlots.forEach((el) => {
        const slot = el.getAttribute('data-ad-slot');
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-react-ad-slot', slot);
        el.parentNode?.replaceChild(wrapper, el);
      });

      const affiliateTables = contentRef.current.querySelectorAll('[data-affiliate-table]');
      affiliateTables.forEach((el) => {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-react-affiliate-table', 'true');
        el.parentNode?.replaceChild(wrapper, el);
      });
    } else {
      // Remove ad placeholders for standalone pages (no monetization)
      const adSlots = contentRef.current.querySelectorAll('[data-ad-slot]');
      adSlots.forEach((el) => {
        el.remove();
      });
      const affiliateTables = contentRef.current.querySelectorAll('[data-affiliate-table]');
      affiliateTables.forEach((el) => {
        el.remove();
      });
    }
  }, [content, monetizationMode]);

  // Render monetization components in placeholders (skip if monetizationMode is 'none')
  useEffect(() => {
    if (!contentRef.current || monetizationMode === 'none') return;

    const adPlaceholders = contentRef.current.querySelectorAll('[data-react-ad-slot]');
    adPlaceholders.forEach((placeholder) => {
      const slot = placeholder.getAttribute('data-react-ad-slot');
      if (slot && !placeholder.hasChildNodes()) {
        // Create a mount point for React component
        const mountPoint = document.createElement('div');
        placeholder.appendChild(mountPoint);
        // Note: In a real implementation, you'd use ReactDOM.render or a portal here
        // For now, we'll use AdSlot directly via dangerouslySetInnerHTML approach
        // Render AdSense ad if adsenseId is available, otherwise show placeholder
        if (adsenseId) {
          placeholder.innerHTML = `
            <ins
              class="adsbygoogle"
              style="display:block"
              data-ad-client="${adsenseId}"
              data-ad-slot="${slot}"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
            <script>
              (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
          `;
        } else {
          // Placeholder when AdSense not configured
          placeholder.innerHTML = `
            <div style="
              min-height: 250px;
              background: var(--border-light, #f9fafb);
              border: 1px solid var(--border, #e5e7eb);
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--text-muted, #9ca3af);
              font-size: 0.875rem;
              margin: var(--spacing-xl, 3rem) 0;
            ">
              <div style="text-align: center;">
                <div>Advertisement</div>
                <div style="font-size: 0.75rem; margin-top: 0.5rem;">Ad Slot: ${slot}</div>
              </div>
            </div>
          `;
        }
      }
    });

    const affiliatePlaceholders = contentRef.current.querySelectorAll('[data-react-affiliate-table]');
    affiliatePlaceholders.forEach((placeholder) => {
      if (!placeholder.hasChildNodes()) {
        placeholder.innerHTML = `
          <div style="
            padding: var(--spacing-lg, 2rem);
            background: var(--border-light, #f9fafb);
            border: 1px solid var(--border, #e5e7eb);
            margin: var(--spacing-xl, 3rem) 0;
          ">
            <h3 style="margin-top: 0; font-size: 1.5rem; margin-bottom: var(--spacing-md, 1.5rem);">Product Comparison</h3>
            <p style="color: var(--text-secondary, #6b7280); font-style: italic;">
              Product comparison table will be displayed here.
            </p>
          </div>
        `;
      }
    });
  }, [content, monetizationMode, adsenseId]);

  // Update active heading on scroll
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -66% 0px' }
    );

    toc.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      toc.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element) observer.unobserve(element);
      });
    };
  }, [toc]);

  // Prefer publishedAt over updatedAt for display (shows original publication date)
  const displayDate = publishedAt || updatedAt;

  return (
    <article className={styles.articleContainer}>
      {/* Breadcrumbs */}
      {categoryKey && (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href={`/${categoryKey}`}>
            {categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}
          </Link>
          <span>/</span>
          <span>{formatTitle(title)}</span>
        </nav>
      )}

      <div className={styles.articleLayout}>
        {/* Main content */}
        <div className={styles.articleMain}>
          {/* Hero Image (thumbnail fallback) */}
          {/* WHY: This is THE hero image for article pages - should use priority
              - Only ONE image per page should have priority + fetchPriority="high"
              - This ensures best LCP (Largest Contentful Paint) score
              - Large sizes for hero image quality */}
          {(() => {
            const normalizedThumbnail = normalizeThumbnail(thumbnail);
            return normalizedThumbnail?.url && (
              <div className={styles.heroImageWrapper}>
                <Image
                  src={normalizedThumbnail.url}
                  alt={title}
                  width={normalizedThumbnail.width || 1200}
                  height={normalizedThumbnail.height || 675}
                  sizes="100vw"
                  quality={80}
                  priority={true}
                  fetchPriority="high"
                  className={styles.heroImage}
                  style={{
                    width: '100%',
                    height: 'auto',
                  }}
                />
              </div>
            );
          })()}
          
          {/* Article Header */}
          {!isStandalone && (
          <header className={styles.articleHeader}>
            <h1 className={styles.articleTitle}>{formatTitle(title)}</h1>
            
            
            <div className={styles.articleMeta}>
              {readingTime && (
                <span className={styles.metaItem}>
                  {readingTime} min read
                </span>
              )}
              {displayDate && (
                <span className={styles.metaItem}>
                  {new Date(displayDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {updatedAt && publishedAt && updatedAt !== publishedAt && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted, #9ca3af)' }}>
                      (Updated)
                    </span>
                  )}
                </span>
              )}
              </div>
            </header>
          )}

          {/* Article Content */}
          <div 
            ref={contentRef}
            className={styles.articleContent}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Table of Contents - Desktop only */}
        {toc.length > 0 && (
          <aside className={styles.tableOfContents} aria-label="Table of contents">
            <h2 className={styles.tocTitle}>Contents</h2>
            <nav>
              <ul className={styles.tocList}>
                {toc.map((item) => (
                  <li 
                    key={item.id} 
                    className={`${styles.tocItem} ${styles[`tocLevel${item.level}`]} ${activeId === item.id ? styles.tocActive : ''}`}
                  >
                    <a 
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(item.id)?.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start'
                        });
                      }}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </article>
  );
}
