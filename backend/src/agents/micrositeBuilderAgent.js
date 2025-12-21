/**
 * MicroSite Builder Agent
 * Orchestrates the creation of microsites with AI-generated content
 */

import { PageService } from '../services/PageService.js';
import { KeywordService } from '../services/KeywordService.js';
import { UXLayoutService } from '../services/UXLayoutService.js';
import { SitemapService } from '../services/SitemapService.js';
import { InternalLinkingService } from '../services/InternalLinkingService.js';
import { NavigationService } from '../services/NavigationService.js';
import { SchemaMarkupService } from '../services/SchemaMarkupService.js';
import { ImageOptimizationService } from '../services/ImageOptimizationService.js';
import { GeminiImageService } from '../services/GeminiImageService.js';
import { ContentImageService } from '../services/ContentImageService.js';
import { ThumbnailService } from '../services/ThumbnailService.js';
import { ContentQualityValidator } from '../utils/contentQualityValidator.js';
import { TenantService } from '../services/TenantService.js';
import { KeywordClusterService } from '../services/KeywordClusterService.js';
import { AIAuditService } from '../services/AIAuditService.js';
import slugify from '../utils/slugify.js';

export class MicrositeBuilderAgent {
  /**
   * Build a complete microsite for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string[]} topics - Array of topics to generate pages for
   * @param {object} options - Optional configuration
   * @param {boolean} options.skipImages - Skip image generation (default: false)
   */
  static async buildMicrosite(tenantId, topics, options = {}) {
    const { skipImages = false, standalonePageType = null } = options;
    const results = {
      pages: [],
      errors: []
    };

    try {
      // Get tenant for layout style and metadata
      const tenant = await TenantService.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const baseUrl = `https://${tenant.domain}`;

      for (const topic of topics) {
        try {
          // Generate stable, unique slug from topic
          const slug = slugify(topic);
          
          // Check if page with this exact slug already exists for this tenant
          // Include unpublished pages to avoid duplicate key errors
          // This ensures we only update pages with matching slugs, never unrelated pages
          const existingPage = await PageService.getPageBySlug(tenantId, slug, true); // includeUnpublished = true
          
          if (existingPage) {
            // Page with this slug exists → UPDATE it (never delete, never overwrite unrelated pages)
            console.log(`🔄 Page Updated: "${topic}" (slug: ${slug})`);
            
            // Update existing page with new content
            // 1. Generate keywords
            const keywords = await KeywordService.generateKeywords(topic, 10, tenantId);

            // 2. Generate long-form content with E-E-A-T principles
            const contentData = await this.generateContentWithEAT(topic, keywords, tenant, { standalonePageType });
            
            // 3. Validate content quality
            const qualityCheck = ContentQualityValidator.validateContent(
              contentData.content,
              {
                title: contentData.metaTitle || topic,
                description: contentData.metaDescription,
                keywords,
                author: contentData.author
              }
            );

            if (!qualityCheck.valid) {
              console.warn(`⚠️  Content quality issues for "${topic}":`, qualityCheck.issues);
            }
            if (qualityCheck.warnings.length > 0) {
              console.warn(`⚠️  Content quality warnings for "${topic}":`, qualityCheck.warnings);
            }
            console.log(`📊 Content quality score: ${qualityCheck.score}/100`);

            // 4. Generate UX Layout with tenant-specific style (skip for standalone pages)
            let uxLayout = null;
            let layoutWithImages = null;
            let optimizedLayout = null;
            
            if (!standalonePageType) {
              uxLayout = await UXLayoutService.generateUXLayout(
                contentData.content, 
                tenant.layoutStyle || 'standard',
                tenant
              );

              // 5. Generate images for the layout using Gemini
              layoutWithImages = uxLayout;
              if (!skipImages && process.env.GEMINI_API_KEY) {
                try {
                  console.log(`📸 Generating images for page: ${topic}`);
                  layoutWithImages = await GeminiImageService.generateLayoutImages(
                    uxLayout,
                    topic,
                    tenant,
                    contentData.content // Pass content to extract image prompts
                  );
                } catch (error) {
                  console.warn(`⚠️  Image generation failed for "${topic}":`, error.message);
                  // Continue without images if generation fails
                  layoutWithImages = uxLayout;
                }
              } else if (skipImages) {
                console.log(`⏭️  Skipping layout image generation for: ${topic}`);
              }

              // 6. Optimize images in layout
              optimizedLayout = ImageOptimizationService.optimizeLayoutImages(layoutWithImages);
            } else {
              console.log(`⏭️  Skipping UX layout generation for standalone page: ${topic}`);
            }

            // 6. Calculate reading time and word count
            const wordCount = qualityCheck.metrics.wordCount;
            const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min

            // 7. Generate schema markup
            const schemaMarkup = SchemaMarkupService.generateAllSchemas(
              { ...existingPage, ...contentData, wordCount },
              tenant,
              baseUrl
            );

            // 8. Update page (only updates fields, never deletes or removes data)
            const pageId = existingPage._id || existingPage.id;
            const updatedPage = await PageService.updatePage(pageId, {
              title: topic,
              content: contentData.content,
              meta: {
                title: contentData.metaTitle || topic,
                description: contentData.metaDescription || contentData.content.substring(0, 160),
                keywords,
                author: contentData.author,
                citations: contentData.citations,
                lastReviewed: new Date()
              },
              uxLayout: optimizedLayout, // null for standalone pages
              schemaMarkup,
              readingTime,
              wordCount,
              adZones: standalonePageType ? [] : ['above-content', 'mid-content', 'below-content'], // No ads for standalone pages
              qualityScore: qualityCheck.score, // Store quality score
              intent: standalonePageType ? 'informational' : undefined, // Standalone pages are informational
              monetizationMode: standalonePageType ? 'none' : undefined // No monetization for standalone pages
            });

            results.pages.push({ ...updatedPage.toObject(), action: 'updated' });
          } else {
            // No page with this slug exists → CREATE a new page
            // This ensures total page count always increases over time
            console.log(`✨ Page Created: "${topic}" (slug: ${slug})`);
            
            // Create new page
            // 1. Generate keywords
            const keywords = await KeywordService.generateKeywords(topic, 10, tenantId);

            // 2. Generate long-form content with E-E-A-T principles
            const contentData = await this.generateContentWithEAT(topic, keywords, tenant, { standalonePageType });

            // 3. Validate content quality
            const qualityCheck = ContentQualityValidator.validateContent(
              contentData.content,
              {
                title: contentData.metaTitle || topic,
                description: contentData.metaDescription,
                keywords,
                author: contentData.author
              }
            );

            if (!qualityCheck.valid) {
              console.warn(`⚠️  Content quality issues for "${topic}":`, qualityCheck.issues);
            }
            if (qualityCheck.warnings.length > 0) {
              console.warn(`⚠️  Content quality warnings for "${topic}":`, qualityCheck.warnings);
            }
            console.log(`📊 Content quality score: ${qualityCheck.score}/100`);

            // 4. Generate UX Layout with tenant-specific style (skip for standalone pages)
            let uxLayout = null;
            let layoutWithImages = null;
            let optimizedLayout = null;
            
            if (!standalonePageType) {
              uxLayout = await UXLayoutService.generateUXLayout(
                contentData.content, 
                tenant.layoutStyle || 'standard',
                tenant
              );

              // 5. Generate images for the layout using Gemini
              layoutWithImages = uxLayout;
              if (!skipImages && process.env.GEMINI_API_KEY) {
                try {
                  console.log(`📸 Generating images for page: ${topic}`);
                  layoutWithImages = await GeminiImageService.generateLayoutImages(
                    uxLayout,
                    topic,
                    tenant,
                    contentData.content // Pass content to extract image prompts
                  );
                } catch (error) {
                  console.warn(`⚠️  Image generation failed for "${topic}":`, error.message);
                  // Continue without images if generation fails
                  layoutWithImages = uxLayout;
                }
              } else if (skipImages) {
                console.log(`⏭️  Skipping layout image generation for: ${topic}`);
              }

              // 6. Optimize images in layout
              optimizedLayout = ImageOptimizationService.optimizeLayoutImages(layoutWithImages);
            } else {
              console.log(`⏭️  Skipping UX layout generation for standalone page: ${topic}`);
            }

            // 7. Calculate reading time and word count
            const wordCount = qualityCheck.metrics.wordCount;
            const readingTime = Math.ceil(wordCount / 200);

            // 8. Generate schema markup
            const schemaMarkup = SchemaMarkupService.generateAllSchemas(
              { title: topic, slug, content: contentData.content, wordCount, isHome: false },
              tenant,
              baseUrl
            );

            // 9. Determine intent and monetization mode from tenant DNA
            let intent = 'informational';
            let monetizationMode = tenant.monetization?.primary || 'adsense';
            
            // Check if topic matches a content pillar category
            if (tenant.contentPillars && tenant.contentPillars.length > 0) {
              for (const pillar of tenant.contentPillars) {
                if (pillar.seedKeywords.includes(topic) || topic.toLowerCase().includes(pillar.categoryKey.toLowerCase())) {
                  monetizationMode = pillar.monetizationMode || monetizationMode;
                  // Infer intent from monetization mode
                  if (monetizationMode === 'lead') {
                    intent = 'lead';
                  } else if (monetizationMode === 'affiliate') {
                    intent = 'commercial';
                  } else {
                    intent = 'informational';
                  }
                  break;
                }
              }
            }

            // 10. Create page (slug is unique and stable, ensuring no conflicts)
            // Note: categoryKey and primaryKeyword will be set by GenerationService after creation
            // New pages are created as unpublished (published: false) by default
            const page = await PageService.createPage({
              tenantId,
              title: topic,
              slug: slug, // Stable slug ensures uniqueness
              content: contentData.content,
              published: false, // New pages are unpublished by default
              meta: {
                title: contentData.metaTitle || topic,
                description: contentData.metaDescription || contentData.content.substring(0, 160),
                keywords,
                author: contentData.author,
                citations: contentData.citations,
                lastReviewed: new Date()
              },
              uxLayout: optimizedLayout, // null for standalone pages
              schemaMarkup,
              readingTime,
              wordCount,
              adZones: standalonePageType ? [] : ['above-content', 'mid-content', 'below-content'], // No ads for standalone pages
              qualityScore: qualityCheck.score,
              intent: standalonePageType ? 'informational' : intent, // Standalone pages are informational
              monetizationMode: standalonePageType ? 'none' : monetizationMode // No monetization for standalone pages
            });

            // Mark keyword as created in cluster (if it's a supporting keyword)
            try {
              await KeywordClusterService.markKeywordCreated(tenantId, topic, page._id);
            } catch (clusterError) {
              console.warn(`⚠️  Could not mark keyword in cluster: ${clusterError.message}`);
            }

            // Generate thumbnail for the page (non-blocking, skip if skipImages is true)
            if (!skipImages) {
              try {
                // Use page.categoryKey if available, otherwise null
                const categoryName = page.categoryKey 
                  ? page.categoryKey.charAt(0).toUpperCase() + page.categoryKey.slice(1)
                  : null;
                
                const thumbnail = await ThumbnailService.generateThumbnailWithRetry(
                  page,
                  tenant,
                  categoryName
                );

                if (thumbnail) {
                  // Update page with thumbnail
                  page.thumbnail = thumbnail;
                  await page.save();
                  console.log(`✅ Thumbnail generated and saved for: ${page.title}`);
                } else {
                  console.warn(`⚠️  Thumbnail generation failed for: ${page.title} (page still created)`);
                }
              } catch (thumbnailError) {
                // Don't block page creation if thumbnail fails
                console.warn(`⚠️  Thumbnail generation error (non-blocking): ${thumbnailError.message}`);
              }
            } else {
              console.log(`⏭️  Skipping thumbnail generation for: ${topic}`);
            }

            results.pages.push({ ...page.toObject(), action: 'created' });
          }
        } catch (error) {
          console.error(`❌ Error processing topic "${topic}":`, error.message);
          results.errors.push({ topic, error: error.message });
        }
      }

      // 5. Skip internal linking for unpublished pages
      // Pages are created as unpublished, so skip linking until they're published
      console.log('⏭️  Skipping internal linking (pages are unpublished)');
      console.log('   Run publish-page.js script to publish pages and update internal links');

      // 6. Skip sitemap update for unpublished pages
      // Pages are created as unpublished, so skip sitemap until they're published
      console.log('⏭️  Skipping sitemap update (pages are unpublished)');
      console.log('   Run publish-page.js script to publish pages and update sitemap');

      // 7. Update navigation menu (auto-generate from all pages)
      try {
        console.log('🧭 Updating navigation menu...');
        const pagesList = await PageService.listPagesForTenant(tenantId);
        
        // Get existing navigation or create new
        const existingNav = await NavigationService.getNavigation(tenantId);
        
        // Update navigation with all pages (excluding homepage)
        const menuItems = pagesList.pages
          .filter(page => page.slug !== 'home') // Exclude homepage from menu
          .map(page => ({
            label: page.title,
            slug: page.slug
          }));

        await NavigationService.upsertNavigation(tenantId, {
          menu: menuItems,
          logo: existingNav?.logo || null,
          cta: existingNav?.cta || { label: null, url: null }
        });
        
        console.log(`✅ Navigation menu updated with ${menuItems.length} items`);
      } catch (error) {
        console.error('❌ Error updating navigation:', error.message);
        results.errors.push({ step: 'navigation', error: error.message });
      }

      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate long-form content with E-E-A-T principles (Experience, Expertise, Authoritativeness, Trustworthiness)
   * Optimized for AdSense approval and SEO
   */
  static async generateContentWithEAT(topic, keywords, tenant, options = {}) {
    const { standalonePageType = null } = options;
    const startTime = Date.now();
    const { generateText } = await import('../services/AIProviderService.js');

    // Extract brand identity and compliance rules from tenant DNA
    const brandIdentity = tenant.brandIdentity || {};
    const compliance = tenant.compliance || {};
    const tone = brandIdentity.tone || 'friendly';
    const language = brandIdentity.language || 'en';
    const brandName = brandIdentity.brandName || tenant.name || 'this website';
    const tagline = brandIdentity.tagline || '';
    const forbiddenTopics = compliance.forbiddenTopics || [];
    const noFakePricing = compliance.noFakePricing !== false;
    const noGuaranteedResults = compliance.noGuaranteedResults !== false;
    const medicalDisclaimer = compliance.medicalDisclaimer !== false;
    const legalDisclaimer = compliance.legalDisclaimer !== false;

    // Build compliance warnings
    let complianceWarnings = '';
    if (forbiddenTopics.length > 0) {
      complianceWarnings += `\n- NEVER mention or write about these topics: ${forbiddenTopics.join(', ')}`;
    }
    if (noFakePricing) {
      complianceWarnings += `\n- NEVER use fake prices or made-up pricing information`;
    }
    if (noGuaranteedResults) {
      complianceWarnings += `\n- NEVER use "guaranteed results" or similar absolute claims`;
    }
    if (medicalDisclaimer) {
      complianceWarnings += `\n- If discussing health/medical topics, include appropriate disclaimers`;
    }
    if (legalDisclaimer) {
      complianceWarnings += `\n- If discussing legal topics, include appropriate disclaimers`;
    }

    // Generate different prompts for standalone pages vs regular content
    let prompt;
    
    if (standalonePageType) {
      // Standalone page prompts (site notice pages)
      const pageTypeMap = {
        'privacy-policy': {
          title: 'Privacy Policy',
          description: 'a comprehensive Privacy Policy page',
          instruction: `Write a professional Privacy Policy page for ${brandName}. This should explain how ${brandName} collects, uses, stores, and protects user data. Include sections on data collection, cookies, user rights, third-party services, data security, and contact information for privacy inquiries.`
        },
        'about-us': {
          title: 'About Us',
          description: 'an About Us page',
          instruction: `Write an engaging About Us page for ${brandName}. This should explain who ${brandName} is, what we do, our mission, values, and what makes us unique. Make it personal and authentic, helping visitors understand our story and connect with our brand.`
        },
        'contact': {
          title: 'Contact',
          description: 'a Contact page',
          instruction: `Write a Contact page for ${brandName}. This should provide clear ways for visitors to get in touch, including contact information, a contact form description, business hours (if applicable), and any other relevant contact methods. Make it easy for visitors to reach out.`
        },
        'cookie-disclosure': {
          title: 'Cookie and Advertising Disclosure',
          description: 'a Cookie and Advertising Disclosure page',
          instruction: `Write a Cookie and Advertising Disclosure page for ${brandName}. This should explain what cookies are used on the site, how they're used, what third-party advertising services are used (like Google AdSense), and how users can manage their cookie preferences. Include information about data collection for advertising purposes.`
        }
      };
      
      const pageInfo = pageTypeMap[standalonePageType] || pageTypeMap['privacy-policy'];
      
      prompt = `${pageInfo.instruction}

This is ${pageInfo.description} for the website ${brandName}${tagline ? ` (${tagline})` : ''}.

BRAND IDENTITY:
- Brand: ${brandName}${tagline ? ` - ${tagline}` : ''}
- Tone: ${tone}
- Language: ${language}
- Write in a ${tone}, professional tone that matches this brand's voice.

COMPLIANCE RULES (CRITICAL - MUST FOLLOW):${complianceWarnings}

REQUIREMENTS:
1. Content Quality:
   - Write clear, professional, and comprehensive content (aim for 800-1200 words)
   - Use a professional but ${tone} tone
   - Well-structured with clear H2 headings for main sections
   - Each section should be informative and easy to understand
   - Use H3 subheadings for detailed points
   - Include bullet points and lists where appropriate for clarity

2. Content Structure:
   - Start with a brief introduction explaining what this page is about
   - Use clear H2 headings for main sections
   - Each section should cover a specific aspect of the topic
   - Include all relevant information that visitors would expect
   - End with contact information or next steps if applicable

3. Formatting:
   - Use HTML tags: <h2> for main headings, <h3> for subheadings
   - Use <ul> and <ol> for lists
   - Use <strong> for emphasis
   - Use <p> for paragraphs
   - Keep paragraphs concise (3-5 sentences)
   - DO NOT use markdown code blocks. Write pure HTML directly.
   - DO NOT wrap HTML in code blocks or markdown syntax. Write HTML tags directly in your response.

4. Legal/Compliance Considerations:
   - For Privacy Policy: Include all required privacy disclosures based on GDPR, CCPA, and other applicable regulations
   - For Cookie Disclosure: Clearly explain cookie usage and user rights
   - For Contact: Ensure all contact information is accurate and accessible
   - For About Us: Keep content authentic and truthful

IMPORTANT: 
- This is a site notice page, not a blog article. Write it from the perspective of ${brandName} explaining our policies, information, or contact details to visitors. Use "we", "our", and "us" to refer to ${brandName}.
- Write the content as pure HTML. Do NOT use markdown syntax, code blocks, or any markdown formatting. Write HTML directly.
- The content will be inserted directly into a webpage, so it must be valid HTML without any markdown formatting.

Write the ${pageInfo.title} page now as pure HTML (no markdown, no code blocks), ensuring it's comprehensive, professional, and provides all necessary information for visitors.`;
    } else {
      // Regular content article prompt
      prompt = `Write a comprehensive, SEO-optimized article about "${topic}" that meets Google's E-E-A-T standards (Experience, Expertise, Authoritativeness, Trustworthiness).

CRITICAL WORD COUNT REQUIREMENT: The article MUST be AT LEAST 1000 words (minimum). Target 1500-2000 words for optimal SEO and authority. Do NOT create articles shorter than 1000 words. Count your words and ensure you meet this requirement.

BRAND IDENTITY:
- Brand: ${brandName}${tagline ? ` - ${tagline}` : ''}
- Tone: ${tone}
- Language: ${language}
- Write in a ${tone} tone that matches this brand's voice.

COMPLIANCE RULES (CRITICAL - MUST FOLLOW):${complianceWarnings}

IMPORTANT: Include 3 image placeholders in your HTML content using this format:
<img data-image-placeholder="true" data-prompt="detailed image description here" alt="descriptive alt text" />

Place images:
- After the introduction (first image)
- After a major H2 section (second image)
- Before the conclusion (final image)

Each image should be relevant to the content around it.

REQUIREMENTS:
1. Content Quality (CRITICAL):
   - ABSOLUTE MINIMUM: 1000 words (required, no exceptions)
   - TARGET: 1500-2000 words for optimal SEO and authority
   - Write substantial, detailed content - do not use filler or repetition
   - Each section must contain meaningful, valuable information
   - Well-researched, factual, and up-to-date information
   - Clear structure with H2/H3 headings
   - Answer-first format (direct answer in first paragraph)
   - Scannable with bullet points, numbered lists, and short paragraphs

2. SEO Optimization:
   - Include these keywords naturally: ${keywords.join(', ')}
   - Use semantic keywords and related terms
   - Optimize for featured snippets (clear answers, lists, tables)
   - Include long-tail keywords
   - Natural keyword density (1-2% for primary keywords)

3. E-E-A-T Principles:
   - Demonstrate expertise through detailed, accurate information
   - Show experience with practical examples and real-world applications
   - Build authority with comprehensive coverage
   - Establish trustworthiness with clear sourcing and citations

4. Content Structure:
   - Start with a direct answer to the main question (100-150 words)
   - Use clear H2 headings for main sections (aim for 4-6 main sections)
   - Each H2 section should be 200-400 words with substantial detail
   - Include H3 subheadings for detailed points (100-200 words each)
   - Add bullet points and numbered lists for scannability
   - Include a conclusion that summarizes key points (150-200 words)
   - MANDATORY: Include an FAQ section with 5 questions and answers (see details below)
   - Ensure total word count reaches AT LEAST 1000 words across all sections

5. FAQ Section (MANDATORY):
   - Include an FAQ section with exactly 5 questions and detailed answers
   - Use H2 heading: <h2>Frequently Asked Questions</h2>
   - Each FAQ item should follow this format:
     <h3>Question here?</h3>
     <p>Detailed answer here (100-150 words per answer). Provide comprehensive, helpful answers that address the question thoroughly.</p>
   - Questions should be relevant to the topic and things readers commonly ask
   - Answers should be substantial (100-150 words each) with detailed explanations
   - Total FAQ section should add approximately 500-750 words to the article
   - Place FAQ section before the conclusion

6. Engagement Elements:
   - Engaging introduction that hooks the reader
   - Practical examples and case studies
   - Actionable tips and advice
   - Visual content suggestions (describe images that would enhance the content)
   - Internal linking opportunities (mention related topics)

7. AdSense Optimization:
   - Content-first approach (valuable content before ads)
   - Natural content flow that keeps readers engaged
   - Clear value proposition
   - High-quality, original content

8. Formatting:
   - Use HTML tags: <h2> for main headings, <h3> for subheadings
   - Use <ul> and <ol> for lists
   - Use <strong> for emphasis
   - Use <p> for paragraphs
   - Include at least 4-6 H2 headings to support substantial content
   - Include at least 3-5 lists with detailed explanations
   - Each paragraph should be 3-5 sentences with detailed information

FINAL REMINDER: 
- Your article MUST be at least 1000 words total. Count your words. 
- The FAQ section with 5 questions and answers is MANDATORY and will add 500-750 words.
- Write comprehensive, detailed sections with substantial information. Short articles will be rejected.
- Structure: Introduction → Main sections (4-6 H2s) → FAQ section (5 Q&As) → Conclusion

Write the article now, ensuring it's comprehensive, valuable, includes the mandatory FAQ section, is at least 1000 words, and optimized for both search engines and human readers.`;
    }

    const content = await generateText({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      systemPrompt: standalonePageType 
        ? `You are an expert writer specializing in creating professional site notice pages (Privacy Policy, About Us, Contact, Cookie Disclosure) for websites.
You write clear, comprehensive, and legally compliant pages that inform visitors about the website's policies, information, and contact details.
You write in a professional but approachable tone that matches the brand's voice.
You always write original, accurate content that provides all necessary information visitors would expect.
CRITICAL: Write content as pure HTML. Do NOT use markdown syntax, code blocks, or any markdown formatting. Write HTML tags directly.`
        : `You are an expert content writer specializing in SEO-optimized, E-E-A-T compliant articles. 
You write comprehensive, well-researched content that demonstrates expertise, experience, authoritativeness, and trustworthiness.
Your articles are optimized for Google AdSense approval and search engine visibility.
You always write original, valuable content that provides real value to readers.
CRITICAL: Every article you write MUST be at least 1000 words. Write substantial, detailed content with meaningful information. Short articles are not acceptable.`,
      temperature: 0.7,
      maxTokens: 8000
    });

    // Clean content: Remove markdown code blocks if present (especially for standalone pages)
    let cleanedContent = content;
    // Remove markdown code blocks (```html ... ``` or ``` ... ```)
    cleanedContent = cleanedContent.replace(/```html\s*([\s\S]*?)```/gi, '$1');
    cleanedContent = cleanedContent.replace(/```\s*([\s\S]*?)```/gi, '$1');
    // Remove any remaining markdown formatting that might have slipped through
    cleanedContent = cleanedContent.replace(/^```/gm, '').replace(/```$/gm, '');
    // Trim any extra whitespace
    cleanedContent = cleanedContent.trim();

    // Extract meta information
    const metaDescription = this.extractMetaDescription(cleanedContent);
    const metaTitle = this.generateMetaTitle(topic, keywords);
    const author = {
      name: tenant.name || 'Content Team',
      bio: `Expert content creators at ${tenant.name}`,
      expertise: keywords.slice(0, 3) // Top 3 keywords as expertise areas
    };

    // Extract citations (in a real scenario, AI could suggest sources)
    const citations = this.extractCitations(cleanedContent);

    return {
      content: cleanedContent, // Use cleaned content (markdown code blocks removed)
      metaTitle,
      metaDescription,
      author,
      citations
    };
  }

  /**
   * Extract meta description from content (first 155-160 characters)
   */
  static extractMetaDescription(content) {
    // Remove HTML tags for description
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (plainText.length <= 160) return plainText;
    
    // Find a good breaking point (sentence end or word boundary)
    let desc = plainText.substring(0, 157);
    const lastSpace = desc.lastIndexOf(' ');
    if (lastSpace > 120) {
      desc = desc.substring(0, lastSpace);
    }
    return desc + '...';
  }

  /**
   * Generate optimized meta title
   */
  static generateMetaTitle(topic, keywords) {
    // Use primary keyword + topic, keep under 60 characters
    const primaryKeyword = keywords[0] || topic;
    if (topic.length + primaryKeyword.length <= 55) {
      return `${topic} - ${primaryKeyword}`;
    }
    return topic.length <= 60 ? topic : topic.substring(0, 57) + '...';
  }

  /**
   * Extract or suggest citations from content
   */
  static extractCitations(content) {
    // In a real implementation, this could use AI to suggest authoritative sources
    // For now, return empty array (can be enhanced)
    return [];
  }
}

