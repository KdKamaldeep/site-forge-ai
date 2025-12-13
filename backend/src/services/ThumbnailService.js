/**
 * Thumbnail Service
 * Generates consistent editorial thumbnails for articles using Gemini
 * Thumbnails are used for cards, listings, hero images, and OpenGraph
 */

import { GeminiImageService } from './GeminiImageService.js';
import { AIAuditService } from './AIAuditService.js';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import axios from 'axios';

// Optional sharp import for image processing (loaded dynamically)
async function getSharp() {
  try {
    const sharpModule = await import('sharp');
    return sharpModule.default;
  } catch (error) {
    // Sharp is optional - thumbnails will work without it
    return null;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thumbnails directory relative to backend root
const THUMBNAILS_DIR = path.join(__dirname, '../../images/thumbnails');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/**
 * Ensure thumbnails directory exists
 */
async function ensureThumbnailsDir(tenantSlug) {
  const tenantDir = path.join(THUMBNAILS_DIR, tenantSlug);
  if (!existsSync(tenantDir)) {
    await mkdir(tenantDir, { recursive: true });
    console.log(`📁 Created thumbnails directory: ${tenantDir}`);
  }
  return tenantDir;
}

/**
 * Check if an existing Gemini image is suitable as thumbnail
 * Criteria: 16:9 ratio, clean background, no text
 */
async function isImageSuitableForThumbnail(imageUrl, title) {
  try {
    // For now, we'll be conservative and always generate a new thumbnail
    // This ensures consistency and quality
    // In the future, we could analyze the image to check if it meets criteria
    return false;
  } catch (error) {
    console.warn('Error checking image suitability:', error.message);
    return false;
  }
}

/**
 * Generate thumbnail image using Gemini
 */
async function generateThumbnailImage(prompt, tenantId) {
  const thumbnailPrompt = `Create a clean, professional editorial thumbnail image.

Topic: ${prompt}

Style rules:
- Minimalist
- Flat illustration or soft photo-style
- Neutral background
- One clear visual concept
- No text, no words, no labels in the image
- No people unless necessary
- No faces close-up
- No logos, no watermarks
- Suitable for a knowledge article

Aspect ratio: 16:9
Resolution: 1200x675
Lighting: soft
Mood: calm, informative, practical`;

  try {
    // Use Gemini to generate image (via existing service)
    const imageUrl = await GeminiImageService.generateImage(thumbnailPrompt, {
      width: 1200,
      height: 675,
      style: 'professional',
      context: 'thumbnail',
      tenantId
    });

    return imageUrl;
  } catch (error) {
    console.error('Error generating thumbnail with Gemini:', error);
    throw error;
  }
}

/**
 * Download and save thumbnail with proper dimensions
 */
async function downloadAndSaveThumbnail(imageUrl, tenantSlug, pageSlug) {
  try {
    const tenantDir = await ensureThumbnailsDir(tenantSlug);
    const filename = `${pageSlug}.png`;
    const filePath = path.join(tenantDir, filename);

    // Skip if file already exists
    if (existsSync(filePath)) {
      console.log(`📸 Thumbnail already exists: ${filename}`);
      return {
        url: `${BACKEND_URL}/images/thumbnails/${tenantSlug}/${filename}`,
        width: 1200,
        height: 675,
        hash: crypto.createHash('md5').update(imageUrl).digest('hex')
      };
    }

    // Download image
    console.log(`⬇️  Downloading thumbnail: ${imageUrl}`);
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Process and resize to exact 16:9 dimensions using sharp (if available)
    let processedImage = response.data;
    const sharpLib = await getSharp();
    if (sharpLib) {
      try {
        processedImage = await sharpLib(response.data)
          .resize(1200, 675, {
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toBuffer();
      } catch (sharpError) {
        // If sharp fails, save original
        console.warn('Sharp processing failed, saving original:', sharpError.message);
        processedImage = response.data;
      }
    } else {
      // Save as-is if sharp is not available
      console.log('Sharp not available, saving thumbnail without processing');
    }

    // Save to disk
    await writeFile(filePath, processedImage);
    console.log(`✅ Saved thumbnail: ${filename}`);

    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    return {
      url: `${BACKEND_URL}/images/thumbnails/${tenantSlug}/${filename}`,
      width: 1200,
      height: 675,
      hash
    };
  } catch (error) {
    console.error('Error downloading/saving thumbnail:', error.message);
    throw error;
  }
}

export class ThumbnailService {
  /**
   * Generate thumbnail for a page
   * @param {object} page - Page object
   * @param {object} tenant - Tenant object
   * @param {string} categoryName - Category name (optional)
   * @returns {Promise<object>} - Thumbnail object with url, width, height, source, generatedAt, hash
   */
  static async generateThumbnail(page, tenant, categoryName = null) {
    const startTime = Date.now();
    const tenantId = tenant?._id?.toString() || null;
    const tenantSlug = tenant?.domain?.replace(/\./g, '-') || 'default';
    const pageSlug = page.slug || page._id?.toString() || 'unknown';
    const pageTitle = page.title || 'Untitled';
    const category = categoryName || page.categoryKey || 'article';

    try {
      // Check if thumbnail already exists
      if (page.thumbnail?.url && page.thumbnail?.generatedAt) {
        console.log(`📸 Thumbnail already exists for: ${pageTitle}`);
        return page.thumbnail;
      }

      // Check if we can reuse existing Gemini image
      // For now, we'll always generate a new thumbnail for consistency
      let thumbnailUrl = null;
      
      // Generate thumbnail using Gemini
      console.log(`🎨 Generating thumbnail for: ${pageTitle}`);
      const imageUrl = await generateThumbnailImage(
        `${pageTitle} - ${category}`,
        tenantId
      );

      // Download and save thumbnail
      const thumbnailData = await downloadAndSaveThumbnail(
        imageUrl,
        tenantSlug,
        pageSlug
      );

      const thumbnail = {
        url: thumbnailData.url,
        width: thumbnailData.width,
        height: thumbnailData.height,
        source: 'gemini',
        generatedAt: new Date(),
        hash: thumbnailData.hash
      };

      const duration = Date.now() - startTime;

      // Log successful generation
      await AIAuditService.logSuccess({
        tenantId,
        service: 'gemini',
        operation: 'generateThumbnail',
        requestData: { pageTitle, category, pageSlug },
        responseData: { thumbnailUrl: thumbnail.url },
        duration,
        metadata: { pageTitle, category }
      });

      console.log(`✅ Thumbnail generated: ${thumbnail.url}`);
      return thumbnail;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed generation
      await AIAuditService.logFailure({
        tenantId,
        service: 'gemini',
        operation: 'generateThumbnail',
        error,
        requestData: { pageTitle, category, pageSlug },
        duration,
        metadata: { pageTitle, category }
      });

      console.error(`❌ Error generating thumbnail for ${pageTitle}:`, error.message);
      
      // Return null on failure - don't block page creation
      return null;
    }
  }

  /**
   * Generate thumbnail with retry logic
   */
  static async generateThumbnailWithRetry(page, tenant, categoryName = null, maxRetries = 2) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateThumbnail(page, tenant, categoryName);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`⚠️  Thumbnail generation attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }
    
    console.error(`❌ Thumbnail generation failed after ${maxRetries} attempts`);
    return null;
  }
}
