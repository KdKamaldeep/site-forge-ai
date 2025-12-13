/**
 * Internal linking service
 * Analyzes content and suggests/creates internal links between pages
 */

export class InternalLinkingService {
  /**
   * Extract keywords from content
   */
  static extractKeywords(content) {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4);
    
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Find pages that match keywords for internal linking
   */
  static async findLinkablePages(keywords, allPages, currentPageId) {
    const linkablePages = [];
    
    for (const page of allPages) {
      if (page._id.toString() === currentPageId) continue;
      
      const pageText = `${page.title} ${page.content} ${(page.meta?.keywords || []).join(' ')}`.toLowerCase();
      const matchCount = keywords.filter(keyword => pageText.includes(keyword)).length;
      
      if (matchCount > 0) {
        linkablePages.push({
          page,
          relevance: matchCount,
          suggestedKeywords: keywords.filter(keyword => pageText.includes(keyword))
        });
      }
    }
    
    return linkablePages
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  /**
   * Inject internal links into content
   */
  static injectLinks(content, linkablePages) {
    let updatedContent = content;
    
    linkablePages.forEach(({ page, suggestedKeywords }) => {
      suggestedKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = updatedContent.match(regex);
        
        if (matches && matches.length > 0) {
          // Replace first occurrence with link
          updatedContent = updatedContent.replace(
            regex,
            `<a href="/${page.slug}" class="internal-link">${keyword}</a>`
          );
        }
      });
    });
    
    return updatedContent;
  }
}

