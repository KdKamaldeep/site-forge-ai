/**
 * Gemini Image Generation Service (FIXED)
 * Uses Google Gen AI SDK (@google/genai) for:
 *  - Gemini image generation models (generateContent with inlineData)
 *  - Imagen models (generateImages with imageBytes)
 *
 * Saves generated images locally and serves them from /images endpoint
 *
 * ENV:
 *  - GEMINI_API_KEY (required)
 *  - GEMINI_IMAGE_MODEL (optional) e.g. "gemini-2.5-flash-image" | "gemini-3-pro-image-preview"
 *  - IMAGEN_MODEL (optional) e.g. "imagen-4.0-generate-001"
 *  - BACKEND_URL (optional) default http://localhost:5000
 *
 * NOTE:
 *  - Google APIs return aspect-ratio based images. If you need exact pixel dimensions,
 *    generate then resize/crop locally (not included here).
 */

import { GoogleGenAI } from '@google/genai';
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

let genaiClient = null;

function getGenAIClient() {
  if (!genaiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}

/**
 * Text model for prompt enhancement (fast/cheap default)
 */
function getGeminiTextModel() {
  const model = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim();
  const modelMap = {
    'gemini-pro': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-flash-latest': 'gemini-1.5-flash-latest',
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp'
  };

  const resolved = modelMap[model.toLowerCase()] || model;

  console.log('------------------------------------------');
  console.log('Gemini TEXT model:', resolved);
  console.log('------------------------------------------');

  return resolved;
}

/**
 * Gemini image model (generateContent) - REQUIRED from GEMINI_IMAGE_MODEL env
 */
function getGeminiImageModel() {
  const envModel = (process.env.GEMINI_IMAGE_MODEL || '').trim();
  if (!envModel) {
    throw new Error('GEMINI_IMAGE_MODEL environment variable is required for Gemini image generation');
  }
  return envModel;
}

/**
 * Imagen model (generateImages) - REQUIRED from IMAGEN_MODEL env
 */
function getImagenModel() {
  const envModel = (process.env.IMAGEN_MODEL || '').trim();
  if (!envModel) {
    throw new Error('IMAGEN_MODEL environment variable is required for Imagen image generation');
  }
  return envModel;
}

export class GeminiImageService {
  /**
   * Generate an image using:
   *  1) Gemini to enhance the prompt (text model)
   *  2) Imagen OR Gemini image models to generate the image
   *  3) Save locally and return `${BACKEND_URL}/images/<file>`
   *
   * options:
   *  - width, height (used to derive aspectRatio)
   *  - style (used for prompt enhancement)
   *  - context (used for prompt enhancement)
   *  - provider: "imagen" | "gemini" (default: "imagen")
   *  - tenantId
   *  - maxRetries: number of retries (default: 2)
   */
  static async generateImage(prompt, options = {}) {
    const startTime = Date.now();
    const tenantId = options.tenantId || null;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    let lastError = null;

    // Retry logic: try up to maxRetries + 1 times (initial attempt + retries)
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying image generation (attempt ${attempt + 1}/${maxRetries + 1})...`);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

      const enhancedPrompt = await this.generateImagePrompt(prompt, options);

      const provider = 'gemini'; //(options.provider || 'imagen').toLowerCase();

        if (attempt === 0) {
      console.log("------------------------------------------")
      console.log('provider', provider);
      console.log("------------------------------------------")
        }
        
      let imageUrl;
      if (provider === 'gemini') {
        imageUrl = await this.generateImageWithGemini(enhancedPrompt, options);
      } else {
        // default = imagen
        imageUrl = await this.generateImageWithImagen(enhancedPrompt, options);
      }

      const duration = Date.now() - startTime;

      await AIAuditService.logSuccess({
        tenantId,
        service: 'gemini',
        operation: 'generateImage',
          requestData: { prompt, enhancedPrompt, options, attempt: attempt + 1 },
        responseData: { imageUrl, provider },
        duration,
          metadata: { prompt: prompt.substring(0, 100), provider, attempts: attempt + 1 }
      });

      return imageUrl;
    } catch (error) {
        lastError = error;
      const duration = Date.now() - startTime;

        // Log failure for this attempt
      await AIAuditService.logFailure({
        tenantId,
        service: 'gemini',
        operation: 'generateImage',
        error,
          requestData: { prompt, options, attempt: attempt + 1 },
        duration,
          metadata: { prompt: prompt.substring(0, 100), attempt: attempt + 1 }
      });

        if (attempt < maxRetries) {
          console.warn(`⚠️  Image generation attempt ${attempt + 1} failed:`, error.message);
          console.log(`   Will retry ${maxRetries - attempt} more time(s)...`);
        } else {
          console.error('Error generating image with Gemini/Imagen after all retries:', error);
      console.warn('⚠️  Falling back to placeholder image service');
        }
    }
    }

    // All retries failed, fall back to placeholder
    return this.getImageFromUnsplash(prompt, options);
  }

  /**
   * ✅ Imagen path (recommended for best fidelity)
   * Uses @google/genai: ai.models.generateImages()
   * Expects base64 at response.generatedImages[0].image.imageBytes
   * Uses ONLY the model specified in IMAGEN_MODEL env variable
   */
  static async generateImageWithImagen(prompt, options = {}) {
    const ai = getGenAIClient();

    const width = options.width || 1200;
    const height = options.height || 630;
    const aspectRatio = this.toAspectRatio(width, height);

    const model = getImagenModel();
    console.log(`🎨 Generating image with Imagen model: ${model} (aspectRatio=${aspectRatio})...`);

    const resp = await ai.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio
        // imageSize: "2K", // optional, depends on model availability
      }
    });

    const imageBytes = resp?.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
      throw new Error('No imageBytes returned from Imagen');
    }

    const buffer = Buffer.from(imageBytes, 'base64');

    const filename = this.makeImageFilename(prompt, width, height, 'png');
    await this.ensureImagesDir();
    await writeFile(path.join(IMAGES_DIR, filename), buffer);

    console.log(`✅ Generated image saved: ${filename}`);
    return `${BACKEND_URL}/images/${filename}`;
  }

  /**
   * ✅ Gemini image path
   * Uses @google/genai: ai.models.generateContent() with imageConfig
   * Expects base64 at candidates[0].content.parts[].inlineData.data
   * Uses ONLY the model specified in GEMINI_IMAGE_MODEL env variable
   */
  static async generateImageWithGemini(prompt, options = {}) {
    const ai = getGenAIClient();

    const width = options.width || 1200;
    const height = options.height || 630;
    const aspectRatio = this.toAspectRatio(width, height);

    const model = getGeminiImageModel();
    console.log(`🎨 Generating image with Gemini model: ${model} (aspectRatio=${aspectRatio})...`);

    const resp = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        imageConfig: { aspectRatio }
      }
    });

    const parts = resp?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p?.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      throw new Error('No inline image data returned from Gemini model');
    }

    const base64 = imagePart.inlineData.data;
    const buffer = Buffer.from(base64, 'base64');

    const filename = this.makeImageFilename(prompt, width, height, 'png');
    await this.ensureImagesDir();
    await writeFile(path.join(IMAGES_DIR, filename), buffer);

    console.log(`✅ Generated image saved: ${filename}`);
    return `${BACKEND_URL}/images/${filename}`;
  }

  /**
   * Generate an enhanced image prompt using Gemini text model
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

    const ai = getGenAIClient();
    const modelName = getGeminiTextModel();

    try {
      const resp = await ai.models.generateContent({
        model: modelName,
        contents: prompt
      });

      // GenAI SDK returns text in candidates/parts
      const text = this.extractTextFromGenAIResponse(resp);
      return (text && text.trim()) ? text.trim() : originalPrompt;
    } catch (error) {
      console.warn(`⚠️  Prompt enhancement failed (${modelName}): ${error.message}`);
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
   * @returns {Promise<string>} - Local image URL served from backend
   */
  static async downloadAndSaveImage(imageUrl, filename = null) {
    try {
      await this.ensureImagesDir();

      if (!filename) {
        const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
        const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
        filename = `${hash}${ext}`;
      }

      const filePath = path.join(IMAGES_DIR, filename);

      if (existsSync(filePath)) {
        console.log(`📸 Image already exists: ${filename}`);
        return `${BACKEND_URL}/images/${filename}`;
      }

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

      await writeFile(filePath, response.data);
      console.log(`✅ Saved image: ${filename}`);

      const imageUrlReturn = `${BACKEND_URL}/images/${filename}`;
      console.log(`📸 Image URL: ${imageUrlReturn}`);
      return imageUrlReturn;
    } catch (error) {
      console.error('Error downloading/saving image:', error.message);
      const width = 1200;
      const height = 630;
      return `https://via.placeholder.com/${width}x${height}?text=Image+Not+Available`;
    }
  }

  /**
   * Fallback: Get random image and save locally (picsum)
   */
  static async getImageFromUnsplash(prompt, options = {}) {
    try {
      const width = options.width || 1200;
      const height = options.height || 630;

      const imageUrl = `https://picsum.photos/${width}/${height}?random=${Date.now()}`;

      const hash = crypto.createHash('md5').update(`${prompt}-${width}-${height}`).digest('hex');
      const filename = `${hash}.jpg`;

      return await this.downloadAndSaveImage(imageUrl, filename);
    } catch (error) {
      console.error('Error getting fallback image:', error);
      const width = options.width || 1200;
      const height = options.height || 630;
      return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(prompt.substring(0, 20))}`;
    }
  }

  /**
   * Extract keywords from a prompt for fallback searching
   */
  static extractKeywords(prompt) {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can'
    ];

    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Extract image prompts from content using OpenAI (unchanged from your file)
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
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const result = response.choices[0].message.content.trim();
      const jsonContent = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const imagePrompts = JSON.parse(jsonContent);
      const prompts = Array.isArray(imagePrompts) ? imagePrompts : [];

      const duration = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || null;
      const estimatedCost = tokensUsed ? (tokensUsed / 1000) * 0.00015 : null;

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

      return [
        { prompt: `${pageTitle} - professional hero image, modern design`, context: 'hero' },
        { prompt: `${pageTitle} - relevant content image, high quality`, context: 'content' }
      ];
    }
  }

  /**
   * Generate images for a UX layout (mostly unchanged)
   */
  static async generateLayoutImages(uxLayout, pageTitle, tenant = null, content = null) {
    if (!uxLayout || !uxLayout.sections || !Array.isArray(uxLayout.sections)) {
      return uxLayout;
    }

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

    const promptsByContext = {};
    extractedPrompts.forEach((item) => {
      const contextKey = item.context || 'content';
      if (!promptsByContext[contextKey]) promptsByContext[contextKey] = [];
      promptsByContext[contextKey].push(item.prompt);
    });

    let promptIndex = 0;

    const updatedSections = await Promise.all(
      uxLayout.sections.map(async (section) => {
        const newSection = { ...section };

        // Hero
        if (section.type === 'hero' && !section.image) {
          const heroPrompt =
            (promptsByContext['hero'] && promptsByContext['hero'][0]) ||
            `${pageTitle} - professional hero image, modern design, high quality`;

          try {
            newSection.image = await this.generateImage(heroPrompt, {
              width: 1920,
              height: 1080,
              style: tenant?.layoutStyle || 'professional',
              tenantId: tenant?._id?.toString() || null,
              provider: tenant?.imageProvider || 'gemini' // allow tenant override
            });
          } catch (error) {
            console.error('Error generating hero image:', error);
          }
        }

        // Grid items
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
                    tenantId: tenant?._id?.toString() || null,
                    provider: tenant?.imageProvider || 'imagen'
                  });
                } catch (error) {
                  console.error('Error generating grid image:', error);
                }
              }
              return item;
            })
          );
        }

        // Image block
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
              tenantId: tenant?._id?.toString() || null,
              provider: tenant?.imageProvider || 'imagen'
            });

            if (!newSection.caption) newSection.caption = pageTitle;
          } catch (error) {
            console.error('Error generating imageBlock image:', error);
          }
        }

        return newSection;
      })
    );

    return { ...uxLayout, sections: updatedSections };
  }

  // -------------------------
  // Helpers (new)
  // -------------------------

  static toAspectRatio(w, h) {
    const r = w / h;

    if (Math.abs(r - 16 / 9) < 0.15) return '16:9';
    if (Math.abs(r - 9 / 16) < 0.15) return '9:16';
    if (Math.abs(r - 4 / 3) < 0.15) return '4:3';
    if (Math.abs(r - 3 / 4) < 0.15) return '3:4';
    return '1:1';
  }

  static makeImageFilename(prompt, width, height, ext = 'png') {
    const hash = crypto
      .createHash('md5')
      .update(`${prompt}-${width}-${height}-${Date.now()}`)
      .digest('hex');
    return `${hash}.${ext}`;
  }

  static extractTextFromGenAIResponse(resp) {
    // Best-effort extraction across possible shapes
    const parts = resp?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p) => typeof p?.text === 'string');
    if (textPart?.text) return textPart.text;

    // Some responses may expose a convenience text() (depends on SDK version)
    try {
      if (typeof resp?.text === 'function') return resp.text();
    } catch (_) {}

    return '';
  }
}
