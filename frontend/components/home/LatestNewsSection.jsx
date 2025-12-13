/**
 * LatestNewsSection Component
 * Section with filter tabs + 2-column grid + sidebar
 */

'use client';

import { useState } from 'react';
import PostCard from './PostCard';
import styles from './LatestNewsSection.module.css';

// Helper function to format category label for tabs
function formatCategoryLabel(category) {
  // If categoryKey exists, format it nicely
  if (category.categoryKey) {
    return category.categoryKey
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // If description exists, take first 2-3 words max
  if (category.description) {
    const words = category.description.split(' ').slice(0, 3);
    return words.join(' ');
  }
  
  return 'Category';
}

export default function LatestNewsSection({ articles = [], categories = [], sidebarContent }) {
  const [activeCategory, setActiveCategory] = useState('all');

  // Filter articles by category
  const filteredArticles = activeCategory === 'all'
    ? articles
    : articles.filter(article => article.categoryKey === activeCategory);

  // Only show categories that have articles
  const categoriesWithArticles = categories.filter(cat => 
    articles.some(article => article.categoryKey === cat.categoryKey)
  );

  return (
    <section className={styles.latestSection}>
      <div className={styles.container}>
        {/* Section Header with Tabs */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Latest News</h2>
          {categoriesWithArticles.length > 0 && (
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeCategory === 'all' ? styles.active : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                All
              </button>
              {categoriesWithArticles.slice(0, 6).map((category) => (
                <button
                  key={category.categoryKey}
                  className={`${styles.tab} ${activeCategory === category.categoryKey ? styles.active : ''}`}
                  onClick={() => setActiveCategory(category.categoryKey)}
                  title={category.description || category.categoryKey}
                >
                  {formatCategoryLabel(category)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid: Posts + Sidebar */}
        <div className={styles.contentGrid}>
          {/* Main: 2-column Post Grid */}
          <div className={styles.postsGrid}>
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <PostCard key={article._id} article={article} />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>No articles found.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {sidebarContent && (
            <aside className={styles.sidebar}>
              {sidebarContent}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

