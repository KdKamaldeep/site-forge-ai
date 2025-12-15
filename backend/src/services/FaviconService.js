/**
 * Favicon Service
 * Generates favicons for tenants from their logo
 * Creates multiple standard sizes and uploads to S3
 */

import axios from 'axios';
import { uploadToS3, isS3Configured } from './S3Service.js';

export class FaviconService {
  /**
   * Standard favicon sizes (industry standard)
   */
  static FAVICON_SIZES = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 48, name: 'favicon-48x48.png' },
    { size: 64, name: 'favicon-64x64.png' },
    { size: 128, name: 'favicon-128x128.png' },
    { size: 180, name: 'apple-touch-icon.png' }, // Apple touch icon
    { size: 192, name: 'android-chrome-192x192.png' }, // Android Chrome
    { size: 512, name: 'android-chrome-512x512.png' }, // Android Chrome
  ];

  /**
   * Generate favicons from tenant logo
   * @param {Object} tenant - Tenant object with logo
   * @returns {Promise<string|null>} Main favicon URL (32x32) or null if generation fails
   */
  static async generateFavicons(tenant) {
    if (!tenant) {
      throw new Error('Tenant is required');
    }

    if (!tenant.logo) {
      console.warn('⚠️  Tenant has no logo. Cannot generate favicon without logo.');
      return null;
    }

    if (!isS3Configured()) {
      throw new Error('S3 is not configured. Favicons must be uploaded to S3.');
    }

    try {
      console.log(`🎨 Generating favicons for tenant: ${tenant.name || tenant.domain}`);
      console.log(`   Using logo: ${tenant.logo}`);

      // Download the logo image
      const logoBuffer = await this.downloadImage(tenant.logo);
      if (!logoBuffer) {
        throw new Error('Failed to download logo image');
      }

      // Resize and upload each favicon size
      const tenantId = tenant._id?.toString() || 'unknown';
      const faviconUrls = {};
      let mainFaviconUrl = null;

      for (const { size, name } of this.FAVICON_SIZES) {
        try {
          const resizedBuffer = await this.resizeImage(logoBuffer, size, size);
          const s3Key = `favicons/${tenantId}/${name}`;
          const faviconUrl = await uploadToS3(resizedBuffer, s3Key, 'image/png');
          faviconUrls[size] = faviconUrl;
          
          // Use 32x32 as the main favicon
          if (size === 32) {
            mainFaviconUrl = faviconUrl;
          }
          
          console.log(`   ✅ Generated ${name} (${size}x${size}): ${faviconUrl}`);
        } catch (error) {
          console.error(`   ❌ Failed to generate ${name}:`, error.message);
        }
      }

      if (!mainFaviconUrl) {
        throw new Error('Failed to generate main favicon (32x32)');
      }

      console.log(`✅ Favicon generation completed. Main favicon: ${mainFaviconUrl}`);
      return mainFaviconUrl;
    } catch (error) {
      console.error(`❌ Error generating favicons for tenant ${tenant.name || tenant.domain}:`, error.message);
      return null;
    }
  }

  /**
   * Download image from URL
   * @param {string} url - Image URL
   * @returns {Promise<Buffer|null>} Image buffer or null if download fails
   */
  static async downloadImage(url) {
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`❌ Error downloading image from ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Resize image to specified dimensions
   * Uses Canvas API (browser) or sharp (Node.js) if available
   * Falls back to simple buffer manipulation if neither is available
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {Promise<Buffer>} Resized image buffer
   */
  static async resizeImage(imageBuffer, width, height) {
    try {
      // Try to use sharp if available (most efficient)
      const sharp = await import('sharp').catch(() => null);
      if (sharp?.default) {
        return await sharp.default(imageBuffer)
          .resize(width, height, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer();
      }
    } catch (error) {
      // Sharp not available, try alternative
    }

    // Fallback: Use canvas or jimp if available
    try {
      const { createCanvas, loadImage } = await import('canvas').catch(() => null);
      if (createCanvas && loadImage) {
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, width, height);
        
        // Draw image centered
        const scale = Math.min(width / img.width, height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        return canvas.toBuffer('image/png');
      }
    } catch (error) {
      // Canvas not available
    }

    // If no image processing library is available, return original buffer
    // This is not ideal but allows the script to run
    console.warn(`⚠️  No image processing library found (sharp/canvas). Install 'sharp' for best results: npm install sharp`);
    console.warn(`   Using original image buffer (may not be correctly sized)`);
    return imageBuffer;
  }
}
