/**
 * Pagination Component
 * Client-side pagination UI
 * Now uses controlled component pattern (no render props)
 */

'use client';

import styles from './Pagination.module.css';

export default function Pagination({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange 
}) {
  const handlePageChange = (page) => {
    if (onPageChange) {
      onPageChange(page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageButton}
        disabled={currentPage === 1}
        onClick={() => handlePageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
        ) : (
          <button
            key={page}
            className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
            onClick={() => handlePageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      ))}

      <button
        className={styles.pageButton}
        disabled={currentPage === totalPages}
        onClick={() => handlePageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  );
}
