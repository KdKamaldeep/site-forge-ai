/**
 * Schema Markup Service
 * Generates JSON-LD structured data for SEO (Article, Organization, BreadcrumbList, FAQPage)
 * Critical for AdSense approval and search engine visibility
 */

export class SchemaMarkupService {
  /**
   * Get article image: hero image > thumbnail > tenant logo
   */
  static getArticleImage(page, tenant, baseUrl) {
    // Try hero image from layout sections[0] (hero section)
    if (page.uxLayout?.sections && Array.isArray(page.uxLayout.sections)) {
      const heroSection = page.uxLayout.sections.find(s => s.type === 'hero');
      if (heroSection?.image) {
        return heroSection.image;
      }
    }
    
    // Fallback to thumbnail
    if (page.thumbnail?.url) {
      return page.thumbnail.url;
    }
    
    // Fallback to ogImage from meta
    if (page.meta?.ogImage) {
      return page.meta.ogImage;
    }
    
    // Final fallback to tenant logo
    return tenant.logo || `${baseUrl}/og-image.jpg`;
  }

  /**
   * Calculate word count from content (strip HTML tags and count words)
   */
  static calculateWordCount(content) {
    if (!content || typeof content !== 'string') return 0;
    
    // Strip HTML tags
    const textContent = content.replace(/<[^>]*>/g, '');
    // Count words (split by whitespace and filter empty strings)
    const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }

  /**
   * Generate Article schema for a page
   */
  static generateArticleSchema(page, tenant, baseUrl) {
    const publishedDate = page.createdAt || page.updatedAt || new Date();
    const modifiedDate = page.updatedAt || publishedDate;
    
    // Get article image (hero > thumbnail > logo)
    const articleImage = this.getArticleImage(page, tenant, baseUrl);
    
    // Get word count: use stored wordCount if available, otherwise calculate from content
    let wordCount = page.wordCount || null;
    if (!wordCount && page.content) {
      wordCount = this.calculateWordCount(page.content);
    }
    // If still no wordCount, default to 0 (shouldn't happen, but safe fallback)
    wordCount = wordCount || 0;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": page.meta?.title || page.title,
      "description": page.meta?.description || page.content?.substring(0, 200),
      "image": articleImage,
      "datePublished": new Date(publishedDate).toISOString(),
      "dateModified": new Date(modifiedDate).toISOString(),
      "author": {
        "@type": "Organization",
        "name": tenant.name,
        "url": baseUrl
      },
      "publisher": {
        "@type": "Organization",
        "name": tenant.name,
        "logo": {
          "@type": "ImageObject",
          "url": tenant.logo || `${baseUrl}/logo.png`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": this.buildCanonicalUrl(page, baseUrl)
      },
      "keywords": page.meta?.keywords?.join(', ') || '',
      "articleSection": this.extractCategory(page),
      "wordCount": wordCount
    };
  }

  /**
   * Generate Organization schema for tenant
   */
  static generateOrganizationSchema(tenant, baseUrl) {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": tenant.name,
      "url": baseUrl,
      "logo": tenant.logo || `${baseUrl}/logo.png`,
      "sameAs": tenant.settings?.socialLinks || []
    };
  }

  /**
   * Generate BreadcrumbList schema
   */
  static generateBreadcrumbSchema(breadcrumbs, baseUrl) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": `${baseUrl}${crumb.url}`
      }))
    };
  }

  /**
   * Generate FAQPage schema from content
   */
  static generateFAQSchema(faqs, baseUrl) {
    if (!faqs || faqs.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }

  /**
   * Generate WebSite schema with search action
   */
  static generateWebSiteSchema(tenant, baseUrl) {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": tenant.name,
      "url": baseUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };
  }

  /**
   * Build canonical URL for a page
   * Uses format: /categoryKey/slug for articles, /slug for home/standalone pages
   */
  static buildCanonicalUrl(page, baseUrl) {
    // Home page uses base URL
    if (page.slug === 'home' || page.isHome) {
      return baseUrl;
    }
    
    // For standalone pages (privacy, about, etc.), use /slug format
    if (page.isStandalone) {
      return `${baseUrl}/${page.slug}`;
    }
    
    // For regular articles, use canonical format: /categoryKey/slug
    const categoryKey = page.categoryKey;
    const hasValidCategoryKey = categoryKey != null && 
                                categoryKey !== '' && 
                                String(categoryKey).trim() !== '' && 
                                String(categoryKey).trim() !== 'null' && 
                                String(categoryKey).trim() !== 'undefined';
    
    if (hasValidCategoryKey) {
      return `${baseUrl}/${String(categoryKey).trim()}/${page.slug}`;
    }
    
    // Fallback to /slug if no categoryKey (shouldn't happen for articles, but safe fallback)
    return `${baseUrl}/${page.slug}`;
  }

  /**
   * Extract category from page content/slug
   */
  static extractCategory(page) {
    // Try to extract category from slug or content
    const slug = page.slug || '';
    if (slug.includes('guide') || slug.includes('how-to')) return 'Guide';
    if (slug.includes('tip') || slug.includes('advice')) return 'Tips';
    if (slug.includes('review') || slug.includes('comparison')) return 'Review';
    if (slug.includes('news') || slug.includes('update')) return 'News';
    return 'Article';
  }

  /**
   * Generate all schemas for a page
   */
  static generateAllSchemas(page, tenant, baseUrl, breadcrumbs = []) {
    const schemas = [];

    // Article schema (main content)
    schemas.push(this.generateArticleSchema(page, tenant, baseUrl));

    // Organization schema
    schemas.push(this.generateOrganizationSchema(tenant, baseUrl));

    // Breadcrumb schema (if breadcrumbs provided)
    if (breadcrumbs.length > 0) {
      schemas.push(this.generateBreadcrumbSchema(breadcrumbs, baseUrl));
    }

    // WebSite schema (for homepage)
    if (page.slug === 'home' || page.isHome) {
      schemas.push(this.generateWebSiteSchema(tenant, baseUrl));
    }

    return schemas.filter(s => s !== null);
  }

  /**
   * Extract FAQs from content using AI (optional enhancement)
   */
  static async extractFAQsFromContent(content) {
    // This could be enhanced with AI to extract FAQs from content
    // For now, return empty array
    return [];
  }
}

