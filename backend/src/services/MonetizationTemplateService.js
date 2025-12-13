/**
 * Monetization Template Service
 * Injects monetization placeholders into page content based on intent and mode
 */

export class MonetizationTemplateService {
  /**
   * Inject monetization placeholders into content
   */
  static injectPlaceholders(content, intent, monetizationMode) {
    let updatedContent = content;

    // Determine actual mode (use mixed if mode is mixed, otherwise use mode)
    const modes = monetizationMode === 'mixed' 
      ? ['adsense', 'affiliate'] 
      : [monetizationMode];

    if (intent === 'informational') {
      // AdSense placeholders for informational content
      if (modes.includes('adsense')) {
        updatedContent = this.injectAdSensePlaceholders(updatedContent);
      }
    } else if (intent === 'commercial') {
      // Affiliate/comparison table for commercial content
      if (modes.includes('affiliate')) {
        updatedContent = this.injectAffiliatePlaceholders(updatedContent);
      }
      // Also add AdSense if mixed
      if (modes.includes('adsense')) {
        updatedContent = this.injectAdSensePlaceholders(updatedContent);
      }
    } else if (intent === 'lead') {
      // CTA + form placeholders for lead generation
      updatedContent = this.injectLeadPlaceholders(updatedContent);
    }

    return updatedContent;
  }

  /**
   * Inject AdSense placeholders
   */
  static injectAdSensePlaceholders(content) {
    // Find good insertion points (after first paragraph, mid-content, before conclusion)
    const paragraphs = content.split('</p>');
    
    if (paragraphs.length < 3) {
      // Not enough content, just add at end
      return content + '\n<div data-ad-slot="in-article-1"></div>';
    }

    let updated = content;
    let insertions = 0;
    const maxInsertions = 3;

    // Insert after first paragraph
    if (paragraphs.length > 1) {
      const firstParaEnd = content.indexOf('</p>', 0) + 4;
      if (firstParaEnd > 0 && insertions < maxInsertions) {
        updated = updated.substring(0, firstParaEnd) + 
          '\n<div data-ad-slot="in-article-1"></div>' + 
          updated.substring(firstParaEnd);
        insertions++;
      }
    }

    // Insert mid-content (around 40% mark)
    if (paragraphs.length > 4) {
      const midPoint = Math.floor(paragraphs.length * 0.4);
      let currentPos = 0;
      for (let i = 0; i < midPoint && i < paragraphs.length; i++) {
        currentPos = content.indexOf('</p>', currentPos) + 4;
      }
      if (currentPos > 0 && insertions < maxInsertions) {
        updated = updated.substring(0, currentPos) + 
          '\n<div data-ad-slot="in-article-2"></div>' + 
          updated.substring(currentPos);
        insertions++;
      }
    }

    // Insert before last paragraph (conclusion)
    if (paragraphs.length > 2) {
      const lastParaStart = content.lastIndexOf('<p>');
      if (lastParaStart > 0 && insertions < maxInsertions) {
        updated = updated.substring(0, lastParaStart) + 
          '\n<div data-ad-slot="in-article-3"></div>\n' + 
          updated.substring(lastParaStart);
        insertions++;
      }
    }

    return updated;
  }

  /**
   * Inject affiliate/comparison table placeholders
   */
  static injectAffiliatePlaceholders(content) {
    // Find a good spot for comparison table (after intro, before detailed content)
    const h2Index = content.indexOf('<h2>');
    const firstH2End = h2Index > 0 ? content.indexOf('</h2>', h2Index) + 5 : -1;

    if (firstH2End > 0) {
      // Insert comparison table after first H2
      const tablePlaceholder = `
<section data-affiliate-table="true" class="affiliate-comparison-table">
  <!-- AI-generated product comparison table will be inserted here -->
</section>
`;
      return content.substring(0, firstH2End) + tablePlaceholder + content.substring(firstH2End);
    }

    // Fallback: insert at beginning
    return '<section data-affiliate-table="true" class="affiliate-comparison-table"></section>\n' + content;
  }

  /**
   * Inject lead generation placeholders
   */
  static injectLeadPlaceholders(content) {
    // Add CTA section before conclusion
    const lastH2Index = content.lastIndexOf('<h2>');
    const conclusionIndex = content.lastIndexOf('</p>');

    const ctaPlaceholder = `
<section data-lead-cta="true" class="lead-generation-cta">
  <div data-whatsapp-button="true"></div>
  <div data-contact-form="true"></div>
</section>
`;

    if (conclusionIndex > 0) {
      // Insert before last paragraph
      return content.substring(0, conclusionIndex) + ctaPlaceholder + content.substring(conclusionIndex);
    } else if (lastH2Index > 0) {
      // Insert after last H2
      const lastH2End = content.indexOf('</h2>', lastH2Index) + 5;
      return content.substring(0, lastH2End) + ctaPlaceholder + content.substring(lastH2End);
    }

    // Fallback: append at end
    return content + ctaPlaceholder;
  }

  /**
   * Generate affiliate table content (AI-generated product list)
   */
  static async generateAffiliateTable(topic, keywords) {
    // This would use AI to generate a comparison table
    // For now, return placeholder structure
    return {
      products: [],
      note: 'AI-generated product comparison table - to be implemented with OpenAI'
    };
  }

  /**
   * Determine intent from content/topic
   */
  static determineIntent(topic, content) {
    const commercialKeywords = ['best', 'top', 'review', 'compare', 'vs', 'buy', 'price', 'cheap', 'deal'];
    const leadKeywords = ['contact', 'quote', 'request', 'consultation', 'free', 'trial', 'demo'];

    const topicLower = topic.toLowerCase();
    const contentLower = content.toLowerCase().substring(0, 500); // First 500 chars

    if (leadKeywords.some(kw => topicLower.includes(kw) || contentLower.includes(kw))) {
      return 'lead';
    }

    if (commercialKeywords.some(kw => topicLower.includes(kw) || contentLower.includes(kw))) {
      return 'commercial';
    }

    return 'informational';
  }
}

