/**
 * Content Quality Validator
 * Validates content quality for SEO and AdSense compliance
 */

export class ContentQualityValidator {
  /**
   * Validate content quality
   */
  static validateContent(content, meta) {
    const issues = [];
    const warnings = [];
    const metrics = this.calculateMetrics(content, meta);

    // Critical validations
    if (metrics.wordCount < 1000) {
      issues.push('Content is too short. Minimum 1000 words recommended for SEO.');
    }

    if (metrics.wordCount > 5000) {
      warnings.push('Content is very long. Consider breaking into multiple pages.');
    }

    if (!meta?.description || meta.description.length < 120) {
      issues.push('Meta description is too short. Should be 120-160 characters.');
    }

    if (meta?.description && meta.description.length > 160) {
      warnings.push('Meta description exceeds 160 characters and may be truncated in search results.');
    }

    if (!meta?.keywords || meta.keywords.length === 0) {
      warnings.push('No keywords specified. Keywords help with SEO.');
    }

    if (metrics.headingCount < 3) {
      warnings.push('Content should have at least 3 headings (H2/H3) for better structure.');
    }

    if (metrics.linkCount === 0) {
      warnings.push('No internal or external links found. Links improve SEO.');
    }

    if (metrics.imageCount === 0) {
      warnings.push('No images found. Images improve engagement and SEO.');
    }

    // E-E-A-T validations
    if (!meta?.author?.name) {
      warnings.push('Author information missing. E-E-A-T requires author attribution.');
    }

    if (metrics.readabilityScore < 60) {
      warnings.push('Content readability may be too complex. Aim for 60+ Flesch Reading Ease score.');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      metrics,
      score: this.calculateQualityScore(metrics, issues.length, warnings.length)
    };
  }

  /**
   * Calculate content metrics
   */
  static calculateMetrics(content, meta) {
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    
    return {
      wordCount: words.length,
      characterCount: plainText.length,
      paragraphCount: (content.match(/<p>/g) || []).length,
      headingCount: (content.match(/<h[2-3]>/gi) || []).length,
      linkCount: (content.match(/<a\s+href=/gi) || []).length,
      imageCount: (content.match(/<img/gi) || []).length + 
                  (content.match(/image/gi) || []).length,
      listCount: (content.match(/<[uo]l>/gi) || []).length,
      readabilityScore: this.calculateReadability(plainText),
      keywordDensity: this.calculateKeywordDensity(plainText, meta?.keywords || [])
    };
  }

  /**
   * Calculate Flesch Reading Ease score (simplified)
   */
  static calculateReadability(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = words.reduce((count, word) => {
      return count + this.countSyllables(word);
    }, 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Simplified Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  static countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Calculate keyword density
   */
  static calculateKeywordDensity(text, keywords) {
    if (!keywords || keywords.length === 0) return {};

    const words = text.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const density = {};

    keywords.forEach(keyword => {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      let count = 0;
      
      for (let i = 0; i <= words.length - keywordWords.length; i++) {
        if (words.slice(i, i + keywordWords.length).join(' ') === keywordWords.join(' ')) {
          count++;
        }
      }

      density[keyword] = {
        count,
        density: totalWords > 0 ? ((count / totalWords) * 100).toFixed(2) : 0
      };
    });

    return density;
  }

  /**
   * Calculate overall quality score (0-100)
   */
  static calculateQualityScore(metrics, issueCount, warningCount) {
    let score = 100;

    // Deduct for issues
    score -= issueCount * 20;

    // Deduct for warnings
    score -= warningCount * 5;

    // Bonus for good metrics
    if (metrics.wordCount >= 1500) score += 10;
    if (metrics.headingCount >= 5) score += 5;
    if (metrics.imageCount >= 3) score += 5;
    if (metrics.linkCount >= 3) score += 5;
    if (metrics.readabilityScore >= 60) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

