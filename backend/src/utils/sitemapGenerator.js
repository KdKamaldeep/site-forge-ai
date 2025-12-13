import { Builder } from 'xml2js';

/**
 * Generate XML sitemap for a tenant with image support
 */
export class SitemapGenerator {
  /**
   * Extract images from page content and UX layout
   */
  static extractImages(page) {
    const images = [];
    
    // Extract from meta ogImage
    if (page.meta?.ogImage) {
      images.push({
        loc: page.meta.ogImage,
        title: page.title,
        caption: page.meta.description || page.title
      });
    }
    
    // Extract from UX layout sections
    if (page.uxLayout?.sections) {
      page.uxLayout.sections.forEach(section => {
        if (section.image) {
          images.push({
            loc: section.image,
            title: section.title || page.title,
            caption: section.caption || section.subtitle || ''
          });
        }
        
        // Extract from grid items
        if (section.items && Array.isArray(section.items)) {
          section.items.forEach(item => {
            if (item.image) {
              images.push({
                loc: item.image,
                title: item.title || page.title,
                caption: item.text || ''
              });
            }
          });
        }
      });
    }
    
    return images;
  }

  /**
   * Generate sitemap XML from pages with image support
   */
  static generateSitemap(pages, baseUrl) {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ', newline: '\n' }
    });

    const urlset = {
      urlset: {
        $: {
          xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
          'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1'
        },
        url: pages.map(page => {
          const url = {
            loc: `${baseUrl}/${page.slug === 'home' ? '' : page.slug}`,
            lastmod: page.updatedAt ? new Date(page.updatedAt).toISOString() : new Date().toISOString(),
            changefreq: this.getChangeFreq(page),
            priority: this.getPriority(page)
          };

          // Add images if available
          const images = this.extractImages(page);
          if (images.length > 0) {
            url['image:image'] = images.map(img => ({
              'image:loc': img.loc,
              'image:title': img.title,
              ...(img.caption && { 'image:caption': img.caption })
            }));
          }

          return url;
        })
      }
    };

    return builder.buildObject(urlset);
  }

  /**
   * Determine change frequency based on page type
   */
  static getChangeFreq(page) {
    if (page.isHome) return 'daily';
    if (page.slug?.includes('blog') || page.slug?.includes('news')) return 'weekly';
    return 'monthly';
  }

  /**
   * Determine priority based on page importance
   */
  static getPriority(page) {
    if (page.isHome) return '1.0';
    if (page.slug === 'about' || page.slug === 'contact') return '0.9';
    return '0.8';
  }

  /**
   * Generate robots.txt content with enhanced rules
   */
  static generateRobotsTxt(baseUrl, sitemapUrl, options = {}) {
    const { disallowPaths = [], allowPaths = [], crawlDelay } = options;
    
    let robots = `User-agent: *
${allowPaths.length > 0 ? allowPaths.map(path => `Allow: ${path}`).join('\n') : 'Allow: /'}
${disallowPaths.length > 0 ? disallowPaths.map(path => `Disallow: ${path}`).join('\n') : ''}
${crawlDelay ? `Crawl-delay: ${crawlDelay}` : ''}

# Sitemaps
Sitemap: ${sitemapUrl}

# Common bot rules
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /`;

    return robots.trim();
  }
}

