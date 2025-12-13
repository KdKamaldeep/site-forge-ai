import OpenAI from 'openai';
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

export class KeywordService {
  /**
   * Generate SEO keywords using OpenAI
   */
  static async generateKeywords(topic, count = 10, tenantId = null) {
    try {
      const openai = getOpenAIClient();
      const prompt = `Generate ${count} highly relevant SEO keywords for the topic: "${topic}". 
Return only a JSON array of keyword strings, no explanations.`;

      const response = await openai.chat.completions.create({
        model: getOpenAIModel(),
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const content = response.choices[0].message.content.trim();
      // Try to parse JSON array
      let keywords = [];
      
      try {
        keywords = JSON.parse(content);
        if (!Array.isArray(keywords)) {
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

