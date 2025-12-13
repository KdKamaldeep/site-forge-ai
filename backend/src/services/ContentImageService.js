/**
 * Content Image Service
 * Generates and injects images into HTML content
 */

import { GeminiImageService } from './GeminiImageService.js';
import { AIAuditService } from './AIAuditService.js';

export class ContentImageService {
  /**
   * Process HTML content and replace image placeholders with actual images
   */
  static async processContentImages(content, topic, tenant = null) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    // Find all image placeholders
    const placeholderRegex = /<img\s+data-image-placeholder="true"\s+data-prompt="([^"]+)"\s+alt="([^"]+)"\s*\/?>/gi;
    const placeholders = [];
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      placeholders.push({
        fullMatch: match[0],
        prompt: match[1],
        alt: match[2],
        index: match.index
      });
    }

    if (placeholders.length === 0) {
      return content;
    }

    console.log(`📸 Found ${placeholders.length} image placeholders in content`);

    // Generate images for each placeholder
    let updatedContent = content;
    let offset = 0; // Track offset from replacements

    for (const placeholder of placeholders) {
      try {
        const startTime = Date.now();
        
        // Generate image using Gemini
        const imageUrl = await GeminiImageService.generateImage(placeholder.prompt, {
          width: 1200,
          height: 630,
          style: tenant?.layoutStyle || 'professional',
          context: 'content',
          tenantId: tenant?._id?.toString() || null
        });

        const duration = Date.now() - startTime;

        // Log successful image generation
        await AIAuditService.logSuccess({
          tenantId: tenant?._id || null,
          service: 'gemini',
          operation: 'generateContentImage',
          requestData: { prompt: placeholder.prompt, topic },
          responseData: { imageUrl },
          duration,
          metadata: { topic, alt: placeholder.alt }
        });

        // Replace placeholder with actual image
        const imageTag = `<img src="${imageUrl}" alt="${placeholder.alt}" loading="lazy" class="content-image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 2rem 0;" />`;
        
        const placeholderIndex = updatedContent.indexOf(placeholder.fullMatch, offset);
        if (placeholderIndex !== -1) {
          updatedContent = updatedContent.substring(0, placeholderIndex) + 
                          imageTag + 
                          updatedContent.substring(placeholderIndex + placeholder.fullMatch.length);
          offset = placeholderIndex + imageTag.length;
        }

        console.log(`✅ Generated image for: ${placeholder.prompt.substring(0, 50)}...`);
      } catch (error) {
        console.error(`❌ Error generating image for placeholder:`, error.message);
        
        // Log failed image generation
        await AIAuditService.logFailure({
          tenantId: tenant?._id || null,
          service: 'gemini',
          operation: 'generateContentImage',
          error,
          requestData: { prompt: placeholder.prompt, topic },
          duration: Date.now() - Date.now(),
          metadata: { topic, alt: placeholder.alt }
        });

        // Replace with placeholder image
        const fallbackImage = `<img src="https://via.placeholder.com/1200x630?text=${encodeURIComponent(placeholder.alt)}" alt="${placeholder.alt}" loading="lazy" class="content-image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 2rem 0;" />`;
        
        const placeholderIndex = updatedContent.indexOf(placeholder.fullMatch, offset);
        if (placeholderIndex !== -1) {
          updatedContent = updatedContent.substring(0, placeholderIndex) + 
                          fallbackImage + 
                          updatedContent.substring(placeholderIndex + placeholder.fullMatch.length);
          offset = placeholderIndex + fallbackImage.length;
        }
      }
    }

    return updatedContent;
  }
}

