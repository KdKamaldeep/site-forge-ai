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
import { ContentQualityValidator } from '../utils/contentQualityValidator.js';
import { TenantService } from '../services/TenantService.js';
import { KeywordClusterService } from '../services/KeywordClusterService.js';
import { AIAuditService } from '../services/AIAuditService.js';
import { getOpenAIModel } from '../config/openaiConfig.js';
import slugify from '../utils/slugify.js';

export class MicrositeBuilderAgent {
  /**
   * Build a complete microsite for a tenant
   */
  static async buildMicrosite(tenantId, topics) {
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
          // This ensures we only update pages with matching slugs, never unrelated pages
          const existingPage = await PageService.getPageBySlug(tenantId, slug);
          
          if (existingPage) {
            // Page with this slug exists → UPDATE it (never delete, never overwrite unrelated pages)
            console.log(`🔄 Page Updated: "${topic}" (slug: ${slug})`);
            
            // Update existing page with new content
            // 1. Generate keywords
            const keywords = await KeywordService.generateKeywords(topic, 10, tenantId);

            // 2. Generate long-form content with E-E-A-T principles
            const contentData = await this.generateContentWithEAT(topic, keywords, tenant);

            // 2.5. Process image placeholders in content and generate actual images
            if (process.env.GEMINI_API_KEY) {
              try {
                console.log(`🖼️  Processing content images for: ${topic}`);
                contentData.content = await ContentImageService.processContentImages(
                  contentData.content,
                  topic,
                  tenant
                );
              } catch (error) {
                console.warn(`⚠️  Content image processing failed:`, error.message);
                // Continue without images
              }
            }

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

            // 4. Generate UX Layout with tenant-specific style
            const uxLayout = await UXLayoutService.generateUXLayout(
              contentData.content, 
              tenant.layoutStyle || 'standard',
              tenant
            );

            // 5. Optimize images in layout
            const optimizedLayout = ImageOptimizationService.optimizeLayoutImages(uxLayout);

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
              uxLayout: optimizedLayout,
              schemaMarkup,
              readingTime,
              wordCount,
              adZones: ['above-content', 'mid-content', 'below-content'], // AdSense-ready zones
              qualityScore: qualityCheck.score // Store quality score
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
            const contentData = await this.generateContentWithEAT(topic, keywords, tenant);

            // 2.5. Process image placeholders in content and generate actual images
            if (process.env.GEMINI_API_KEY) {
              try {
                console.log(`🖼️  Processing content images for: ${topic}`);
                contentData.content = await ContentImageService.processContentImages(
                  contentData.content,
                  topic,
                  tenant
                );
              } catch (error) {
                console.warn(`⚠️  Content image processing failed:`, error.message);
                // Continue without images
              }
            }

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

            // 4. Generate UX Layout with tenant-specific style
            const uxLayout = await UXLayoutService.generateUXLayout(
              contentData.content, 
              tenant.layoutStyle || 'standard',
              tenant
            );

            // 5. Generate images for the layout using Gemini
            let layoutWithImages = uxLayout;
            if (process.env.GEMINI_API_KEY) {
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
            }

            // 6. Optimize images in layout
            const optimizedLayout = ImageOptimizationService.optimizeLayoutImages(layoutWithImages);

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
            const page = await PageService.createPage({
              tenantId,
              title: topic,
              slug: slug, // Stable slug ensures uniqueness
              content: contentData.content,
              meta: {
                title: contentData.metaTitle || topic,
                description: contentData.metaDescription || contentData.content.substring(0, 160),
                keywords,
                author: contentData.author,
                citations: contentData.citations,
                lastReviewed: new Date()
              },
              uxLayout: optimizedLayout,
              schemaMarkup,
              readingTime,
              wordCount,
              adZones: ['above-content', 'mid-content', 'below-content'],
              qualityScore: qualityCheck.score,
              intent,
              monetizationMode
            });

            // Mark keyword as created in cluster (if it's a supporting keyword)
            try {
              await KeywordClusterService.markKeywordCreated(tenantId, topic, page._id);
            } catch (clusterError) {
              console.warn(`⚠️  Could not mark keyword in cluster: ${clusterError.message}`);
            }

            results.pages.push({ ...page.toObject(), action: 'created' });
          }
        } catch (error) {
          console.error(`❌ Error processing topic "${topic}":`, error.message);
          results.errors.push({ topic, error: error.message });
        }
      }

      // 5. Build internal linking
      try {
        console.log('🔗 Building internal links...');
        await InternalLinkingService.refreshAllLinks(tenantId);
        console.log('✅ Internal links updated');
      } catch (error) {
        console.error('❌ Error building internal links:', error.message);
        results.errors.push({ step: 'internalLinking', error: error.message });
      }

      // 6. Update sitemap
      try {
        console.log('🗺️  Updating sitemap...');
        await SitemapService.updateSitemap(tenantId);
        console.log('✅ Sitemap updated');
      } catch (error) {
        console.error('❌ Error updating sitemap:', error.message);
        results.errors.push({ step: 'sitemap', error: error.message });
      }

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
  static async generateContentWithEAT(topic, keywords, tenant) {
    const startTime = Date.now();
    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    const openai = new OpenAI({ apiKey });

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

    const prompt = `Write a comprehensive, SEO-optimized article about "${topic}" (1500-2500 words) that meets Google's E-E-A-T standards (Experience, Expertise, Authoritativeness, Trustworthiness).

BRAND IDENTITY:
- Brand: ${brandName}${tagline ? ` - ${tagline}` : ''}
- Tone: ${tone}
- Language: ${language}
- Write in a ${tone} tone that matches this brand's voice.

COMPLIANCE RULES (CRITICAL - MUST FOLLOW):${complianceWarnings}

IMPORTANT: Include 3-5 image placeholders in your HTML content using this format:
<img data-image-placeholder="true" data-prompt="detailed image description here" alt="descriptive alt text" />

Place images:
- After the introduction (first image)
- After each major H2 section (2-3 images)
- Before the conclusion (final image)

Each image should be relevant to the content around it.

REQUIREMENTS:
1. Content Quality:
   - Minimum 1500 words, target 2000+ words for authority
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
   - Start with a direct answer to the main question
   - Use clear H2 headings for main sections
   - Include H3 subheadings for detailed points
   - Add bullet points and numbered lists for scannability
   - Include a conclusion that summarizes key points

5. Engagement Elements:
   - Engaging introduction that hooks the reader
   - Practical examples and case studies
   - Actionable tips and advice
   - Visual content suggestions (describe images that would enhance the content)
   - Internal linking opportunities (mention related topics)

6. AdSense Optimization:
   - Content-first approach (valuable content before ads)
   - Natural content flow that keeps readers engaged
   - Clear value proposition
   - High-quality, original content

7. Formatting:
   - Use HTML tags: <h2> for main headings, <h3> for subheadings
   - Use <ul> and <ol> for lists
   - Use <strong> for emphasis
   - Use <p> for paragraphs
   - Include at least 3-5 headings
   - Include at least 2-3 lists

Write the article now, ensuring it's comprehensive, valuable, and optimized for both search engines and human readers.`;

    const response = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        {
          role: 'system',
          content: `You are an expert content writer specializing in SEO-optimized, E-E-A-T compliant articles. 
You write comprehensive, well-researched content that demonstrates expertise, experience, authoritativeness, and trustworthiness.
Your articles are optimized for Google AdSense approval and search engine visibility.
You always write original, valuable content that provides real value to readers.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content.trim();

    // Extract meta information
    const metaDescription = this.extractMetaDescription(content);
    const metaTitle = this.generateMetaTitle(topic, keywords);
    const author = {
      name: tenant.name || 'Content Team',
      bio: `Expert content creators at ${tenant.name}`,
      expertise: keywords.slice(0, 3) // Top 3 keywords as expertise areas
    };

    // Extract citations (in a real scenario, AI could suggest sources)
    const citations = this.extractCitations(content);

    return {
      content,
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

