/**
 * Gemini Image Generation Service
 * Uses Google Gemini API to enhance image prompts and extract keywords
 * Downloads images and saves them locally, serving from /images endpoint
 * 
 * Note: Gemini is multimodal (can understand images) but doesn't directly generate images.
 * For actual image generation, Google offers Imagen 3 through Vertex AI.
 * This service uses Gemini to create better prompts/keywords, then fetches images from Unsplash.
 * 
 * Future: Can be upgraded to use Imagen 3 API for direct image generation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { AIAuditService } from './AIAuditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Images directory relative to backend root
const IMAGES_DIR = path.join(__dirname, '../../images');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

let geminiClient = null;

function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

/**
 * Get the Gemini model name from environment variable
 * Defaults to 'gemini-1.5-flash' which is stable and widely supported
 * Note: 'gemini-pro' is deprecated, use 'gemini-1.5-flash' or 'gemini-1.5-pro'
 */
function getGeminiModel() {
  // Try different possible model names based on availability
  // Default to gemini-1.5-flash (faster and cheaper) or gemini-1.5-pro (more capable)
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  // Map common model names to their correct API identifiers
  const modelMap = {
    'gemini-pro': 'gemini-1.5-flash', // Map deprecated gemini-pro to gemini-1.5-flash
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-flash-latest': 'gemini-1.5-flash-latest',
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp'
  };
  console.log("------------------------------------------")
  console.log('model', modelMap[model.toLowerCase()] || model);
  console.log("------------------------------------------")
  
  return modelMap[model.toLowerCase()] || model;
}

export class GeminiImageService {
  /**
   * Generate an image using Gemini-enhanced prompts
   * 
   * Process:
   * 1. Uses Gemini to enhance the image description/prompt
   * 2. Uses Gemini to extract optimal search keywords
   * 3. Fetches relevant image and saves it locally
   * 
   * Future Enhancement: Can integrate Imagen 3 API (Google Cloud Vertex AI) for direct image generation
   * 
   * @param {string} prompt - Description of the image to generate
   * @param {object} options - Additional options (width, height, style)
   * @returns {Promise<string>} - Local image path (relative to /images)
   */
  static async generateImage(prompt, options = {}) {
    const startTime = Date.now();
    const tenantId = options.tenantId || null;
    
    try {
      // Generate a detailed image description/prompt using Gemini
      const enhancedPrompt = await this.generateImagePrompt(prompt, options);
      
      // Use Unsplash API with Gemini-extracted keywords
      const imageUrl = await this.getImageFromUnsplash(enhancedPrompt, options);
      
      const duration = Date.now() - startTime;
      
      // Log successful call
      await AIAuditService.logSuccess({
        tenantId,
        service: 'gemini',
        operation: 'generateImage',
        requestData: { prompt, enhancedPrompt, options },
        responseData: { imageUrl },
        duration,
        metadata: { prompt: prompt.substring(0, 100) }
      });
      
      return imageUrl;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed call
      await AIAuditService.logFailure({
        tenantId,
        service: 'gemini',
        operation: 'generateImage',
        error,
        requestData: { prompt, options },
        duration,
        metadata: { prompt: prompt.substring(0, 100) }
      });
      
      console.error('Error generating image with Gemini:', error);
      // Fallback to Unsplash with original prompt
      return this.getImageFromUnsplash(prompt, options);
    }
  }

  /**
   * Generate an enhanced image prompt using Gemini
   */
  static async generateImagePrompt(originalPrompt, options = {}) {
    const style = options.style || 'professional';
    const context = options.context || 'website content';

    const prompt = `Generate a detailed, SEO-friendly image description for a ${context} image.
    
Original request: "${originalPrompt}"
Style: ${style}

Requirements:
- Professional, high-quality image description
- Include relevant keywords for SEO
- Suitable for web use
- Describe colors, composition, and mood
- Keep it concise (2-3 sentences)

Return only the enhanced image description, nothing else.`;

    const client = getGeminiClient();
    const modelName = getGeminiModel();
    
    // Try the configured model first
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const enhancedPrompt = response.text().trim();
      return enhancedPrompt || originalPrompt;
    } catch (error) {
      // If model not found or unavailable, try fallback models
      if ((error.message && error.message.includes('not found')) || 
          (error.message && error.message.includes('404')) ||
          (error.message && error.message.includes('not supported'))) {
        console.warn(`⚠️  Model "${modelName}" not available (${error.message}), trying fallback models...`);
        
        // Try gemini-1.5-flash first (most widely available)
        const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest'];
        
        for (const fallbackModelName of fallbackModels) {
          if (fallbackModelName === modelName) continue; // Skip if it's the same as the original
          
          try {
            console.log(`🔄 Trying fallback model: ${fallbackModelName}`);
            const fallbackModel = client.getGenerativeModel({ model: fallbackModelName });
            const result = await fallbackModel.generateContent(prompt);
            const response = await result.response;
            const enhancedPrompt = response.text().trim();
            console.log(`✅ Successfully used fallback model: ${fallbackModelName}`);
            return enhancedPrompt || originalPrompt;
          } catch (fallbackError) {
            console.warn(`⚠️  Fallback model ${fallbackModelName} also failed: ${fallbackError.message}`);
            continue; // Try next fallback
          }
        }
        
        // All fallbacks failed
        console.error('❌ All Gemini models failed, using original prompt');
        return originalPrompt;
      }
      // For other errors, return original prompt
      console.error('❌ Error generating image prompt:', error.message);
      return originalPrompt;
    }
  }

  /**
   * Ensure images directory exists
   */
  static async ensureImagesDir() {
    if (!existsSync(IMAGES_DIR)) {
      await mkdir(IMAGES_DIR, { recursive: true });
      console.log(`📁 Created images directory: ${IMAGES_DIR}`);
    }
  }

  /**
   * Download image from URL and save locally
   * @param {string} imageUrl - URL of the image to download
   * @param {string} filename - Optional filename (will generate if not provided)
   * @returns {Promise<string>} - Local image path (relative to /images)
   */
  static async downloadAndSaveImage(imageUrl, filename = null) {
    try {
      await this.ensureImagesDir();

      // Generate filename if not provided
      if (!filename) {
        const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
        const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
        filename = `${hash}${ext}`;
      }

      const filePath = path.join(IMAGES_DIR, filename);

      // Skip if file already exists
      if (existsSync(filePath)) {
        console.log(`📸 Image already exists: ${filename}`);
        // Return full URL for existing images too
        return `${BACKEND_URL}/images/${filename}`;
      }

      // Download image
      console.log(`⬇️  Downloading image: ${imageUrl}`);
      const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Save to disk
      await writeFile(filePath, response.data);
      console.log(`✅ Saved image: ${filename}`);

      // Return full URL so images can be loaded from backend
      // Use BACKEND_URL from env or default to localhost:5000
      const imageUrlReturn = `${BACKEND_URL}/images/${filename}`;
      console.log(`📸 Image URL: ${imageUrlReturn}`);
      return imageUrlReturn;
    } catch (error) {
      console.error('Error downloading/saving image:', error.message);
      // Return placeholder as fallback
      const width = 1200;
      const height = 630;
      return `https://via.placeholder.com/${width}x${height}?text=Image+Not+Available`;
    }
  }

  /**
   * Get image from Unsplash using generated keywords and save locally
   * This is a fallback until we integrate actual image generation
   */
  static async getImageFromUnsplash(prompt, options = {}) {
    try {
      // Extract keywords from prompt
      const keywords = this.extractKeywords(prompt);
      const searchQuery = keywords.slice(0, 3).join(' ');
      
      const width = options.width || 1200;
      const height = options.height || 630;
      
      // Use Unsplash Source API (no key required for basic usage)
      // Note: source.unsplash.com is deprecated, use picsum.photos as better alternative
      // For now, we'll use a placeholder service that actually works
      const imageUrl = `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
      
      // Download and save locally
      const hash = crypto.createHash('md5').update(`${prompt}-${width}-${height}`).digest('hex');
      const filename = `${hash}.jpg`;
      
      const localPath = await this.downloadAndSaveImage(imageUrl, filename);
      return localPath;
    } catch (error) {
      console.error('Error getting image from Unsplash:', error);
      // Ultimate fallback - return placeholder URL
      const width = options.width || 1200;
      const height = options.height || 630;
      return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(prompt.substring(0, 20))}`;
    }
  }

  /**
   * Extract keywords from a prompt for image search
   */
  static extractKeywords(prompt) {
    // Remove common words and extract meaningful keywords
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can'];
    
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Remove duplicates and return top keywords
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Extract image prompts from content using AI
   * Analyzes content to identify where images should be placed and what they should show
   * @param {string} content - The content to analyze
   * @param {string} pageTitle - Title of the page for context
   * @returns {Promise<Array<{prompt: string, context: string}>>} - Array of image prompts with context
   */
  static async extractImagePromptsFromContent(content, pageTitle, tenantId = null) {
    const startTime = Date.now();
    
    try {
      const OpenAI = (await import('openai')).default;
      const { getOpenAIModel } = await import('../config/openaiConfig.js');
      
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = `Analyze the following content and suggest 2-4 relevant image descriptions that would enhance the content visually.

Page Title: "${pageTitle}"

Content:
${content.substring(0, 3000)}

For each suggested image, provide:
1. A detailed image description/prompt (what should be shown in the image)
2. The context/placement (hero, content section, feature illustration, etc.)

Return a JSON array with this format:
[
  {"prompt": "detailed image description", "context": "hero|content|feature"},
  ...
]

Focus on images that:
- Are relevant to the content topic
- Would improve SEO and user engagement
- Support the main message
- Are professional and high-quality

Return ONLY the JSON array, no markdown, no explanations.`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: 'system',
            content: 'You are a content strategist that identifies optimal image placement and descriptions for SEO and user engagement. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const result = response.choices[0].message.content.trim();
      // Clean JSON (remove markdown code blocks if present)
      const jsonContent = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const imagePrompts = JSON.parse(jsonContent);
      const prompts = Array.isArray(imagePrompts) ? imagePrompts : [];
      
      const duration = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || null;
      const estimatedCost = tokensUsed ? (tokensUsed / 1000) * 0.00015 : null;
      
      // Log successful call
      await AIAuditService.logSuccess({
        tenantId,
        service: 'openai',
        operation: 'extractImagePromptsFromContent',
        requestData: { pageTitle, contentLength: content.length },
        responseData: { promptsCount: prompts.length, tokensUsed },
        duration,
        tokensUsed,
        estimatedCost,
        metadata: { pageTitle }
      });
      
      return prompts;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed call
      await AIAuditService.logFailure({
        tenantId,
        service: 'openai',
        operation: 'extractImagePromptsFromContent',
        error,
        requestData: { pageTitle, contentLength: content.length },
        duration,
        metadata: { pageTitle }
      });
      
      console.error('Error extracting image prompts from content:', error);
      // Fallback: generate basic prompts
      return [
        { prompt: `${pageTitle} - professional hero image, modern design`, context: 'hero' },
        { prompt: `${pageTitle} - relevant content image, high quality`, context: 'content' }
      ];
    }
  }

  /**
   * Generate images for a UX layout
   * Scans the layout for image fields and generates images for them
   * Also extracts image prompts from content if provided
   * @param {object} uxLayout - The UX layout object
   * @param {string} pageTitle - Title of the page for context
   * @param {object} tenant - Tenant object for context
   * @param {string} content - Optional content to extract image prompts from
   * @returns {Promise<object>} - Updated UX layout with generated image URLs
   */
  static async generateLayoutImages(uxLayout, pageTitle, tenant = null, content = null) {
    if (!uxLayout || !uxLayout.sections || !Array.isArray(uxLayout.sections)) {
      return uxLayout;
    }

    // Extract image prompts from content if provided
    let extractedPrompts = [];
    if (content) {
      try {
        const tenantId = tenant?._id?.toString() || null;
        extractedPrompts = await this.extractImagePromptsFromContent(content, pageTitle, tenantId);
        console.log(`📝 Extracted ${extractedPrompts.length} image prompts from content`);
      } catch (error) {
        console.warn('Could not extract image prompts from content:', error.message);
      }
    }

    // Map extracted prompts by context
    const promptsByContext = {};
    extractedPrompts.forEach((item, index) => {
      const context = item.context || 'content';
      if (!promptsByContext[context]) {
        promptsByContext[context] = [];
      }
      promptsByContext[context].push(item.prompt);
    });

    let promptIndex = 0;

    const updatedSections = await Promise.all(
      uxLayout.sections.map(async (section) => {
        const newSection = { ...section };

        // Generate hero image
        if (section.type === 'hero' && !section.image) {
          let heroPrompt;
          if (promptsByContext['hero'] && promptsByContext['hero'].length > 0) {
            heroPrompt = promptsByContext['hero'][0];
          } else {
            heroPrompt = `${pageTitle} - professional hero image, modern design, high quality`;
          }
          try {
            newSection.image = await this.generateImage(heroPrompt, {
              width: 1920,
              height: 1080,
              style: tenant?.layoutStyle || 'professional',
              tenantId: tenant?._id?.toString() || null
            });
          } catch (error) {
            console.error('Error generating hero image:', error);
          }
        }

        // Generate grid item images
        if (section.type === 'grid' && section.items && Array.isArray(section.items)) {
          newSection.items = await Promise.all(
            section.items.map(async (item) => {
              if (!item.image && item.title) {
                const gridPrompt = `${item.title} - ${pageTitle} - professional image, clean design`;
                try {
                  item.image = await this.generateImage(gridPrompt, {
                    width: 800,
                    height: 600,
                    style: tenant?.layoutStyle || 'professional',
                    tenantId: tenant?._id?.toString() || null
                  });
                } catch (error) {
                  console.error('Error generating grid image:', error);
                }
              }
              return item;
            })
          );
        }

        // Generate imageBlock images
        if (section.type === 'imageBlock' && !section.image) {
          let imagePrompt;
          if (promptsByContext['content'] && promptsByContext['content'].length > promptIndex) {
            imagePrompt = promptsByContext['content'][promptIndex];
            promptIndex++;
          } else {
            imagePrompt = `${pageTitle} - relevant image, high quality, professional`;
          }
          try {
            newSection.image = await this.generateImage(imagePrompt, {
              width: 1200,
              height: 630,
              style: tenant?.layoutStyle || 'professional',
              tenantId: tenant?._id?.toString() || null
            });
            if (!newSection.caption) {
              newSection.caption = pageTitle;
            }
          } catch (error) {
            console.error('Error generating imageBlock image:', error);
          }
        }

        return newSection;
      })
    );

    return { ...uxLayout, sections: updatedSections };
  }
}

