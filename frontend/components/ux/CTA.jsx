import styles from './ux-components.module.css';
import Link from 'next/link';

export default function CTA({ text, link, variant = 'primary', relatedPagesItems = [], allSections = [], categoryKey = null, ...props }) {
  // Detect placeholder links (like "url_to_installation_guide" or "/url_to_installation_guide")
  const isPlaceholderLink = link && (
    link.includes('url_to_') || 
    link.includes('placeholder') || 
    link.startsWith('/url_to_')
  );
  
  // Resolve actual link
  let resolvedLink = link;
  let resolvedCategoryKey = null;
  
  if (isPlaceholderLink || !link) {
    // Try to get first related page href
    if (relatedPagesItems && relatedPagesItems.length > 0) {
      const firstRelatedPage = relatedPagesItems[0];
      if (firstRelatedPage.href) {
        resolvedLink = firstRelatedPage.href;
      } else if (firstRelatedPage.categoryKey && firstRelatedPage.slug) {
        resolvedLink = `/${firstRelatedPage.categoryKey}/${firstRelatedPage.slug}`;
      } else if (firstRelatedPage.categoryKey) {
        // If we have categoryKey but no slug, use category page
        resolvedLink = `/${firstRelatedPage.categoryKey}`;
      }
      // Extract categoryKey from first related page for fallback
      if (firstRelatedPage.categoryKey) {
        resolvedCategoryKey = firstRelatedPage.categoryKey;
      }
    }
    
    // If still no link, try to extract categoryKey from sections
    if (!resolvedLink && allSections) {
      // Try to find categoryKey from relatedPages section items
      for (const section of allSections) {
        if (section.type === 'relatedPages' && section.items && Array.isArray(section.items) && section.items.length > 0) {
          const firstItem = section.items[0];
          if (firstItem.categoryKey) {
            resolvedCategoryKey = firstItem.categoryKey;
            if (firstItem.href) {
              resolvedLink = firstItem.href;
            } else if (firstItem.slug) {
              resolvedLink = `/${firstItem.categoryKey}/${firstItem.slug}`;
            } else {
              resolvedLink = `/${firstItem.categoryKey}`;
            }
            break;
          }
        }
        // Also check other section types that might have categoryKey
        if (section.categoryKey) {
          resolvedCategoryKey = section.categoryKey;
          resolvedLink = `/${section.categoryKey}`;
          break;
        }
      }
    }
    
    // Final fallback to category page if we found a categoryKey
    if (!resolvedLink && resolvedCategoryKey) {
      resolvedLink = `/${resolvedCategoryKey}`;
    }
    
    // If still no link and we have categoryKey prop, use it
    if (!resolvedLink && categoryKey) {
      resolvedLink = `/${categoryKey}`;
    }
  }
  
  // If still no link, use the original link (even if placeholder - better than broken link)
  if (!resolvedLink) {
    resolvedLink = link || '/';
  }
  
  // Check if link is external
  const isExternal = resolvedLink?.startsWith('http://') || resolvedLink?.startsWith('https://');
  const href = resolvedLink?.startsWith('/') ? resolvedLink : `/${resolvedLink}`;
  
  const className = `${styles.ctaButton} ${styles[`cta${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`;

  if (isExternal) {
    return (
      <div className={styles.ctaSection} {...props}>
        <a href={resolvedLink} className={className} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      </div>
    );
  }

  return (
    <div className={styles.ctaSection} {...props}>
      <Link href={href} className={className}>
        {text}
      </Link>
    </div>
  );
}

