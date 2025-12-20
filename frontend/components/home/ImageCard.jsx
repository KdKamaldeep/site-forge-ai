/**
 * ImageCard Component
 * 
 * Production-ready image card with Next.js Image optimization
 * 
 * WHY this component exists:
 * - Uses Next.js <Image fill /> for automatic responsive sizing
 * - Enforces 16:9 aspect ratio to prevent CLS (Cumulative Layout Shift)
 * - Lazy-loads by default (except when priority=true)
 * - Quality ~70 for optimal size/quality balance
 * - Object-fit cover ensures consistent card appearance
 * 
 * Performance optimizations:
 * - Responsive sizes: smaller images on mobile, larger on desktop
 * - WebP/AVIF format conversion handled by Next.js Image Optimizer
 * - Lazy loading reduces initial page weight
 * - Aspect ratio container prevents layout shift during image load
 */

import Image from 'next/image';
import { normalizeThumbnail, normalizeImageUrl } from '@/lib/imageUtils';
import styles from './ImageCard.module.css';

export default function ImageCard({
  image,
  thumbnail,
  alt = '',
  priority = false,
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  quality = 70,
  ...props
}) {
  // Normalize image URL from either thumbnail object or direct image string
  const normalizedThumbnail = normalizeThumbnail(thumbnail);
  const normalizedImage = normalizeImageUrl(image);
  
  const imageUrl = normalizedThumbnail?.url || normalizedImage;
  
  if (!imageUrl) {
    // Return placeholder to maintain aspect ratio and prevent CLS
    return (
      <div className={`${styles.imageContainer} ${className}`} {...props}>
        <div className={styles.imagePlaceholder} />
      </div>
    );
  }

  return (
    <div className={`${styles.imageContainer} ${className}`} {...props}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        quality={quality}
        priority={priority}
        // LCP Optimization: Set fetchPriority="high" for priority images to improve LCP
        // This tells the browser to prioritize this image resource loading
        fetchPriority={priority ? 'high' : 'auto'}
        className={styles.image}
        style={{
          objectFit: 'cover',
        }}
        // WHY: Prevent layout shift by ensuring image loads with proper dimensions
        // The aspect-ratio container handles sizing, but this ensures smooth loading
      />
    </div>
  );
}

