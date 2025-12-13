/**
 * Text Formatting Utilities
 * Provides title case formatting for display while preserving slugs/URLs
 */

// Common small words that should stay lowercase (unless first word)
const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'via', 'from', 'with', 'over'
]);

// Known acronyms that should stay uppercase
const ACRONYMS = new Set([
  'ai', 'ac', 'dc', 'usb', 'roi', 'seo', 'faq', 'api', 'cpu', 'gpu', 'hvac',
  'url', 'html', 'css', 'js', 'http', 'https', 'json', 'xml', 'pdf', 'jpg', 'png'
]);

/**
 * Check if a string is mostly lowercase (more than 70% of letters are lowercase)
 */
export function isMostlyLowercase(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return false;
  
  const lowercaseCount = letters.split('').filter(c => c === c.toLowerCase()).length;
  return lowercaseCount / letters.length > 0.7;
}

/**
 * Convert word to title case (smart)
 */
function titleCaseWord(word: string, index: number, words: string[]): string {
  const lowerWord = word.toLowerCase();
  
  // Handle acronyms
  if (ACRONYMS.has(lowerWord)) {
    return lowerWord.toUpperCase();
  }
  
  // First word always capitalized
  if (index === 0) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  
  // Small words stay lowercase (unless they're the first word)
  if (SMALL_WORDS.has(lowerWord)) {
    return lowerWord;
  }
  
  // Capitalize other words
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Convert text to smart title case
 */
export function toTitleCaseSmart(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  // Split by spaces, but preserve structure
  // Handle colons specially - capitalize after colon
  const parts = text.split(':');
  const processedParts = parts.map((part, partIndex) => {
    const words = part.trim().split(/(\s+)/);
    const processedWords = words.map((word, wordIndex) => {
      // Preserve whitespace
      if (/^\s+$/.test(word)) return word;
      
      // Get actual word index in the sentence
      const actualWordIndex = words.slice(0, wordIndex).filter(w => !/^\s+$/.test(w)).length;
      
      // If this is after a colon, treat as new sentence
      const effectiveIndex = partIndex > 0 ? 0 : actualWordIndex;
      
      return titleCaseWord(word, effectiveIndex, words.filter(w => !/^\s+$/.test(w)));
    });
    
    return processedWords.join('');
  });
  
  return processedParts.join(': ');
}

/**
 * Format title for display
 * Returns original if already properly cased, otherwise applies smart title case
 */
export function formatTitle(title: string): string {
  if (!title || typeof title !== 'string') return title || '';
  
  // If title is mostly lowercase, format it
  if (isMostlyLowercase(title)) {
    return toTitleCaseSmart(title);
  }
  
  // Otherwise, return as-is (assumes it's already properly formatted)
  return title;
}

/**
 * Clean description text by removing markdown code blocks and HTML tags
 */
export function cleanDescription(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  
  return text
    // Remove markdown code blocks (```html, ```, etc.)
    .replace(/```[\w]*\n?/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
}

/**
 * Get excerpt from description (cleaned and truncated)
 */
export function getExcerpt(description: string, maxWords: number = 20): string {
  if (!description) return '';
  
  const cleaned = cleanDescription(description);
  const words = cleaned.split(' ');
  
  if (words.length <= maxWords) return cleaned;
  
  return words.slice(0, maxWords).join(' ') + '...';
}

