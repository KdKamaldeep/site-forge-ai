import { generateText } from './AIProviderService.js';

export class KeywordService {
  /**
   * Generate SEO keywords using configured AI provider
   */
  static async generateKeywords(topic, count = 10, tenantId = null) {
    try {
      const prompt = `Generate ${count} highly relevant SEO keywords for the topic: "${topic}". 
Return only a JSON array of keyword strings, no explanations.`;

      const content = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are an SEO expert. Return only valid JSON arrays.',
        temperature: 0.7,
        maxTokens: 200,
        jsonMode: true
      });
      // Try to parse JSON array
      let keywords = [];
      
      try {
        const parsed = JSON.parse(content);
        // Handle both direct array and object with keywords property
        if (Array.isArray(parsed)) {
          keywords = parsed;
        } else if (parsed.keywords && Array.isArray(parsed.keywords)) {
          keywords = parsed.keywords;
        } else {
          keywords = content.split(',').map(k => k.trim().replace(/["\[\]]/g, ''));
        }
      } catch (e) {
        // Fallback: split by comma
        keywords = content.split(',').map(k => k.trim().replace(/["\[\]]/g, ''));
      }

      return keywords.slice(0, count);
    } catch (error) {
      console.error('Error generating keywords:', error);
      // Fallback to basic keyword generation
      return this.generateBasicKeywords(topic, count);
    }
  }

  /**
   * Fallback basic keyword generation
   */
  static generateBasicKeywords(topic, count) {
    const baseKeywords = [
      topic,
      `${topic} guide`,
      `${topic} tips`,
      `best ${topic}`,
      `${topic} review`,
      `how to ${topic}`,
      `${topic} explained`,
      `${topic} benefits`,
      `${topic} features`,
      `${topic} comparison`
    ];
    
    return baseKeywords.slice(0, count);
  }
}

