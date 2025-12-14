'use client';

/**
 * Client Component wrapper for paginated Latest News Section
 * This is needed because Server Components cannot pass functions to Client Components
 */

import { useState, useMemo } from 'react';
import Pagination from './Pagination';
import LatestNewsSection from './LatestNewsSection';
import styles from './PaginatedLatestNews.module.css';

export default function PaginatedLatestNews({ 
  articles = [], 
  categories = [],
  itemsPerPage = 12 
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return articles.slice(startIndex, endIndex);
  }, [articles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(articles.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If no pagination needed, just render the section
  if (totalPages <= 1) {
    return (
      <LatestNewsSection
        articles={articles}
        categories={categories}
        sidebarContent={null}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <LatestNewsSection
        articles={paginatedItems}
        categories={categories}
        sidebarContent={null}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
