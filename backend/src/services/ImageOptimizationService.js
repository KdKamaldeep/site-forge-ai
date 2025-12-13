/**
 * Image Optimization Service
 * Handles image optimization, lazy loading, and performance metrics
 */

export class ImageOptimizationService {
  /**
   * Optimize image URL for WebP format and lazy loading
   * In production, this would integrate with image CDN (e.g., Cloudinary, Imgix)
   */
  static optimizeImageUrl(imageUrl, options = {}) {
    if (!imageUrl) return null;

    const {
      width = null,
      height = null,
      quality = 85,
      format = 'webp',
      lazy = true
    } = options;

    // If using a CDN, construct optimized URL
    // Example: https://cdn.example.com/image.jpg?w=800&h=600&q=85&f=webp
    if (imageUrl.includes('cdn.') || imageUrl.includes('cloudinary') || imageUrl.includes('imgix')) {
      const url = new URL(imageUrl);
      if (width) url.searchParams.set('w', width);
      if (height) url.searchParams.set('h', height);
      if (quality) url.searchParams.set('q', quality);
      if (format) url.searchParams.set('f', format);
      return url.toString();
    }

    // For placeholder images or external URLs, return as-is
    // In production, you'd want to proxy through your CDN
    return imageUrl;
  }

  /**
   * Generate responsive image srcset
   */
  static generateSrcSet(imageUrl, sizes = [400, 800, 1200, 1600]) {
    if (!imageUrl) return null;

    return sizes
      .map(size => `${this.optimizeImageUrl(imageUrl, { width: size })} ${size}w`)
      .join(', ');
  }

  /**
   * Extract and optimize images from UX layout
   */
  static optimizeLayoutImages(uxLayout) {
    if (!uxLayout?.sections) return uxLayout;

    const optimizedLayout = {
      ...uxLayout,
      sections: uxLayout.sections.map(section => {
        const optimizedSection = { ...section };

        // Optimize hero images
        if (section.type === 'hero' && section.image) {
          optimizedSection.image = this.optimizeImageUrl(section.image, {
            width: 1600,
            height: 600,
            quality: 90
          });
          optimizedSection.imageSrcSet = this.generateSrcSet(section.image);
        }

        // Optimize grid item images
        if (section.type === 'grid' && section.items) {
          optimizedSection.items = section.items.map(item => ({
            ...item,
            image: item.image ? this.optimizeImageUrl(item.image, {
              width: 400,
              height: 300,
              quality: 85
            }) : item.image,
            imageSrcSet: item.image ? this.generateSrcSet(item.image) : null
          }));
        }

        // Optimize imageBlock images
        if (section.type === 'imageBlock' && section.image) {
          optimizedSection.image = this.optimizeImageUrl(section.image, {
            width: 1200,
            quality: 90
          });
          optimizedSection.imageSrcSet = this.generateSrcSet(section.image);
        }

        return optimizedSection;
      })
    };

    return optimizedLayout;
  }

  /**
   * Calculate image performance metrics
   */
  static calculateImageMetrics(images) {
    if (!images || images.length === 0) {
      return {
        totalImages: 0,
        optimizedImages: 0,
        totalSize: 0,
        averageSize: 0,
        lazyLoadable: 0
      };
    }

    const optimized = images.filter(img => 
      img.includes('webp') || 
      img.includes('w=') || 
      img.includes('q=')
    ).length;

    return {
      totalImages: images.length,
      optimizedImages: optimized,
      optimizationRate: (optimized / images.length) * 100,
      lazyLoadable: images.length - 1 // All except first image
    };
  }

  /**
   * Generate lazy loading attributes
   */
  static getLazyLoadAttributes(index = 0, threshold = 1) {
    // First image loads immediately, others lazy load
    if (index < threshold) {
      return { loading: 'eager', fetchpriority: 'high' };
    }
    return { loading: 'lazy', decoding: 'async' };
  }
}

