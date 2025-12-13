import OpenAI from 'openai';
import { PageService } from './PageService.js';
import { KeywordService } from './KeywordService.js';
import { UXLayoutService } from './UXLayoutService.js';
import { getOpenAIModel } from '../config/openaiConfig.js';

// Lazy initialization of OpenAI client
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export class ContentRefreshService {
  /**
   * Refresh and improve page content
   */
  static async refreshContent(pageId) {
    const page = await PageService.getPageById(pageId);
    if (!page) {
      throw new Error('Page not found');
    }

    try {
      const openai = getOpenAIClient();
      // Generate improved content
      const prompt = `Improve and expand the following page content. 
Make it more engaging, SEO-friendly, and comprehensive (aim for 1000-2000 words).
Keep the core message but enhance it with better structure, examples, and details.

Current content:
${page.content}

Return the improved content only, no explanations.`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: 'system',
            content: 'You are a professional content writer specializing in SEO-optimized articles.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });

      const improvedContent = response.choices[0].message.content.trim();

      // Generate new keywords
      const keywords = await KeywordService.generateKeywords(page.title, 10, page.tenantId);

      // Generate new UX layout from improved content
      const uxLayout = await UXLayoutService.generateUXLayout(improvedContent);

      // Update meta description
      const metaDescription = improvedContent.substring(0, 160).replace(/\s+/g, ' ').trim();

      // Update the page
      const updatedPage = await PageService.updatePage(pageId, {
        content: improvedContent,
        meta: {
          ...page.meta,
          keywords,
          description: metaDescription || page.meta?.description
        },
        uxLayout
      });

      return updatedPage;
    } catch (error) {
      console.error('Error refreshing content:', error);
      throw error;
    }
  }

  /**
   * Expand a specific section of content
   */
  static async expandSection(pageId, sectionText) {
    const page = await PageService.getPageById(pageId);
    if (!page) {
      throw new Error('Page not found');
    }

    try {
      const openai = getOpenAIClient();
      const prompt = `Expand and improve the following section of content. 
Make it more detailed, informative, and engaging (aim for 300-500 words).

Section to expand:
${sectionText}

Return the expanded section only.`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: 'system',
            content: 'You are a professional content writer.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error expanding section:', error);
      throw error;
    }
  }
}

