/**
 * Schema Markup Service
 * Generates JSON-LD structured data for SEO (Article, Organization, BreadcrumbList, FAQPage)
 * Critical for AdSense approval and search engine visibility
 */

export class SchemaMarkupService {
  /**
   * Generate Article schema for a page
   */
  static generateArticleSchema(page, tenant, baseUrl) {
    const publishedDate = page.createdAt || page.updatedAt || new Date();
    const modifiedDate = page.updatedAt || publishedDate;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": page.meta?.title || page.title,
      "description": page.meta?.description || page.content?.substring(0, 200),
      "image": page.meta?.ogImage || tenant.logo || `${baseUrl}/og-image.jpg`,
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
        "@id": `${baseUrl}/${page.slug === 'home' ? '' : page.slug}`
      },
      "keywords": page.meta?.keywords?.join(', ') || '',
      "articleSection": this.extractCategory(page),
      "wordCount": page.content?.length || 0
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

