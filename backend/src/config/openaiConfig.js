/**
 * OpenAI Configuration
 * Centralized configuration for OpenAI API settings
 */

/**
 * Get the OpenAI model from environment variable
 * Defaults to 'gpt-4' if not set
 */
export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || process.env.GPT_MODEL || 'gpt-4';
}

/**
 * Get OpenAI model configuration
 * Returns object with model name and default settings
 */
export function getOpenAIConfig() {
  return {
    model: getOpenAIModel(),
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000
  };
}

