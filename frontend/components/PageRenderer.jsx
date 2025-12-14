'use client';

/**
 * PageRenderer component
 * Renders page content using UX Layout JSON from backend or ArticleLayout for HTML content
 * Includes schema markup for SEO
 */

import { renderUXLayout } from '@/lib/componentFactory';
import SchemaMarkup from '@/components/seo/SchemaMarkup';
import MonetizationRenderer from './monetization/MonetizationRenderer';
import ArticleLayout from './ArticleLayout';

export default function PageRenderer({ 
  layout, 
  content, 
  meta, 
  title, 
  schemaMarkup, 
  readingTime, 
  wordCount, 
  intent, 
  monetizationMode,
  categoryKey,
  updatedAt,
  publishedAt,
  thumbnail,
  isStandalone,
}) {
  // Render UX Layout if available (structured layout) - skip for standalone pages
  if (!isStandalone && layout?.sections && Array.isArray(layout.sections) && layout.sections.length > 0) {
    return (
      <>
        {/* Schema Markup for SEO */}
        {schemaMarkup && <SchemaMarkup schemas={schemaMarkup} />}
        
        <div className="page-renderer">
          
          {renderUXLayout(layout)}
        </div>
      </>
    );
  }

  // Editorial article layout for HTML content (used for both regular and standalone pages)
  return (
    <>
      {/* Schema Markup for SEO */}
      {schemaMarkup && <SchemaMarkup schemas={schemaMarkup} />}
      
      <ArticleLayout
        content={content}
        title={title}
        meta={meta}
        readingTime={readingTime}
        wordCount={wordCount}
        categoryKey={categoryKey}
        updatedAt={updatedAt}
        publishedAt={publishedAt}
        intent={intent || 'informational'}
        monetizationMode={isStandalone ? 'none' : (monetizationMode || 'adsense')} // No ads for standalone pages
        thumbnail={thumbnail}
        isStandalone={isStandalone}
      />
    </>
  );
}
