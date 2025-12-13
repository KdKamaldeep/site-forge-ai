/**
 * SEO validation utilities
 */
export class SEOValidator {
  /**
   * Validate meta title
   */
  static validateTitle(title) {
    if (!title) return { valid: false, error: 'Title is required' };
    if (title.length < 30) return { valid: false, error: 'Title should be at least 30 characters' };
    if (title.length > 60) return { valid: false, error: 'Title should be max 60 characters' };
    return { valid: true };
  }

  /**
   * Validate meta description
   */
  static validateDescription(description) {
    if (!description) return { valid: false, error: 'Description is required' };
    if (description.length < 120) return { valid: false, error: 'Description should be at least 120 characters' };
    if (description.length > 160) return { valid: false, error: 'Description should be max 160 characters' };
    return { valid: true };
  }

  /**
   * Validate keywords
   */
  static validateKeywords(keywords) {
    if (!Array.isArray(keywords)) return { valid: false, error: 'Keywords must be an array' };
    if (keywords.length === 0) return { valid: false, error: 'At least one keyword is required' };
    if (keywords.length > 10) return { valid: false, error: 'Maximum 10 keywords allowed' };
    return { valid: true };
  }

  /**
   * Validate content length
   */
  static validateContent(content) {
    if (!content) return { valid: false, error: 'Content is required' };
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 300) return { valid: false, error: 'Content should be at least 300 words' };
    return { valid: true, wordCount };
  }

  /**
   * Validate complete SEO data
   */
  static validateSEO(meta, content) {
    const errors = [];
    
    const titleCheck = this.validateTitle(meta?.title);
    if (!titleCheck.valid) errors.push(titleCheck.error);
    
    const descCheck = this.validateDescription(meta?.description);
    if (!descCheck.valid) errors.push(descCheck.error);
    
    const keywordsCheck = this.validateKeywords(meta?.keywords);
    if (!keywordsCheck.valid) errors.push(keywordsCheck.error);
    
    const contentCheck = this.validateContent(content);
    if (!contentCheck.valid) errors.push(contentCheck.error);
    
    return {
      valid: errors.length === 0,
      errors,
      wordCount: contentCheck.wordCount
    };
  }
}

