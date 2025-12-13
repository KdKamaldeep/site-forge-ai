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
}) {
  // Render UX Layout if available (structured layout)
  if (layout?.sections && Array.isArray(layout.sections) && layout.sections.length > 0) {
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

  // Editorial article layout for HTML content
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
        monetizationMode={monetizationMode || 'adsense'}
      />
    </>
  );
}
