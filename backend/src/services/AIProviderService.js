/**
 * AI Provider Service
 * Unified interface for OpenAI and Gemini AI providers
 * Switches based on AI_PROVIDER environment variable (OPENAI or GEMINI)
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

const AI_PROVIDER = (process.env.AI_PROVIDER || 'OPENAI').toUpperCase();

// Lazy initialization of clients
let openaiClient = null;
let geminiClient = null;

/**
 * Get OpenAI client
 */
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

/**
 * Get Gemini client
 */
function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

/**
 * Get the current AI provider
 */
export function getAIProvider() {
  return AI_PROVIDER;
}

/**
 * Get the model name based on provider
 */
export function getAIModel() {
  if (AI_PROVIDER === 'GEMINI') {
    return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }
  return process.env.OPENAI_MODEL || process.env.GPT_MODEL || 'gpt-4o-mini';
}

/**
 * Generate text completion using the configured provider
 * 
 * @param {Object} params - Completion parameters
 * @param {Array} params.messages - Array of message objects with role and content
 * @param {string} params.systemPrompt - System prompt (optional)
 * @param {number} params.temperature - Temperature (default: 0.7)
 * @param {number} params.maxTokens - Max tokens (default: 4000)
 * @param {boolean} params.jsonMode - Return JSON response (default: false)
 * @returns {Promise<string>} Generated text content
 */
export async function generateText({
  messages = [],
  systemPrompt = null,
  temperature = 0.7,
  maxTokens = 4000,
  jsonMode = false
}) {
  if (AI_PROVIDER === 'GEMINI') {
    return generateTextWithGemini({
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      jsonMode
    });
  } else {
    return generateTextWithOpenAI({
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      jsonMode
    });
  }
}

/**
 * Generate text with OpenAI
 */
async function generateTextWithOpenAI({
  messages,
  systemPrompt,
  temperature,
  maxTokens,
  jsonMode
}) {
  const client = getOpenAIClient();
  const model = getAIModel();

  // Format messages for OpenAI
  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  formattedMessages.push(...messages);

  const requestOptions = {
    model,
    messages: formattedMessages,
    temperature,
    max_tokens: maxTokens
  };

  // Add JSON mode if requested (OpenAI supports this)
  if (jsonMode) {
    requestOptions.response_format = { type: 'json_object' };
  }

  const response = await client.chat.completions.create(requestOptions);
  return response.choices[0].message.content.trim();
}

/**
 * Generate text with Gemini
 */
async function generateTextWithGemini({
  messages,
  systemPrompt,
  temperature,
  maxTokens,
  jsonMode
}) {
  const client = getGeminiClient();
  const model = getAIModel();

  // Build the prompt from messages
  let prompt = '';
  
  // Add system prompt if provided
  if (systemPrompt) {
    prompt += `${systemPrompt}\n\n`;
  }

  // Add instruction for JSON mode if requested
  if (jsonMode) {
    prompt += 'IMPORTANT: You MUST return ONLY valid JSON. Do not include any markdown code blocks, explanations, or text outside of the JSON object.\n\n';
  }

  // Convert messages to a single prompt for Gemini
  // Gemini doesn't use the same message format as OpenAI
  for (const message of messages) {
    if (message.role === 'system') {
      prompt += `${message.content}\n\n`;
    } else if (message.role === 'user') {
      prompt += `${message.content}\n\n`;
    } else if (message.role === 'assistant') {
      prompt += `Assistant: ${message.content}\n\n`;
    }
  }

  try {
    // Use generateContent for Gemini (same API as image generation uses for text)
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature,
        maxOutputTokens: maxTokens
      }
    });

    // Extract text from Gemini response (using same pattern as GeminiImageService)
    const text = extractTextFromGenAIResponse(response);
    if (!text) {
      throw new Error('No content returned from Gemini');
    }

    let cleanText = text.trim();

    // Clean JSON if requested (remove markdown code blocks)
    if (jsonMode) {
      cleanText = cleanText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
    }

    return cleanText;
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    throw new Error(`Gemini text generation failed: ${error.message}`);
  }
}

/**
 * Extract text from Gemini GenAI SDK response
 * Helper function matching GeminiImageService pattern
 */
function extractTextFromGenAIResponse(resp) {
  const parts = resp?.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find((p) => p?.text);
  return textPart?.text || null;
}

/**
 * Chat completion helper (maintains conversation context)
 * Similar to OpenAI's chat.completions.create
 */
export async function chatCompletion({
  messages = [],
  temperature = 0.7,
  maxTokens = 4000,
  jsonMode = false
}) {
  return generateText({
    messages,
    temperature,
    maxTokens,
    jsonMode
  });
}

