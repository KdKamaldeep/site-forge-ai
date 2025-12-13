import { generateText } from './AIProviderService.js';
import { PageService } from './PageService.js';
import { KeywordService } from './KeywordService.js';
import { UXLayoutService } from './UXLayoutService.js';

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
      // Generate improved content
      const prompt = `Improve and expand the following page content. 
Make it more engaging, SEO-friendly, and comprehensive (aim for 1000-2000 words).
Keep the core message but enhance it with better structure, examples, and details.

Current content:
${page.content}

Return the improved content only, no explanations.`;

      const improvedContent = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are a professional content writer specializing in SEO-optimized articles.',
        temperature: 0.7,
        maxTokens: 3000
      });

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
      const prompt = `Expand and improve the following section of content. 
Make it more detailed, informative, and engaging (aim for 300-500 words).

Section to expand:
${sectionText}

Return the expanded section only.`;

      return await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are a professional content writer.',
        temperature: 0.7,
        maxTokens: 1000
      });
    } catch (error) {
      console.error('Error expanding section:', error);
      throw error;
    }
  }
}

