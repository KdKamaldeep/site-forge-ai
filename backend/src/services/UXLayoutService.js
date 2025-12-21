import { generateText } from './AIProviderService.js';
import { validateUXLayout, getDefaultUXLayout } from '../utils/uxSchemaValidator.js';
import { getLayoutStyle, getTenantLayoutStyle } from '../utils/layoutStyles.js';

export class UXLayoutService {
  /**
   * Generate UX layout from content using AI
   * Returns format: { sections: [...] } matching frontend componentFactory
   * @param {string} content - The content to convert to layout
   * @param {string} style - Layout style name (e.g., 'modernMinimal', 'boldVibrant')
   * @param {object} tenant - Optional tenant object for style-specific generation
   */
  static async generateUXLayout(content, style = 'standard', tenant = null) {
    try {
      
      // Get layout style details if tenant provided
      let styleDetails = null;
      if (tenant) {
        const layoutStyle = getTenantLayoutStyle(tenant);
        styleDetails = layoutStyle;
        style = tenant.layoutStyle || style;
      } else if (style && style !== 'standard') {
        styleDetails = getLayoutStyle(style);
      }

      // Build style-specific instructions
      let styleInstructions = '';
      if (styleDetails) {
        styleInstructions = `
LAYOUT STYLE: ${styleDetails.name}
Description: ${styleDetails.description}
Characteristics: ${styleDetails.characteristics.join(', ')}
Section Preferences:
${JSON.stringify(styleDetails.sectionPreferences, null, 2)}

Apply this style throughout the layout.`;
      }

      const prompt = `Convert the following content into a UX layout JSON structure optimized for SEO and user engagement.

CRITICAL: You MUST return a JSON object with this EXACT structure:
{
  "sections": [
    { "type": "hero", "title": "...", "subtitle": "...", "image": "..." },
    { "type": "paragraph", "text": "..." },
    { "type": "grid", "columns": number (1-4), "items": Array<{title: string, text: string, image?: string}> },
    { "type": "infoBox", "title": "...", "text": "...", "variant": "info"|"warning"|"success" },
    { "type": "cta", "text": "...", "link": "...", "variant": "primary"|"secondary" },
    { "type": "imageBlock", "image": "...", "caption": "..." },
    { "type": "featureList", "items": Array<{title: string, description: string, image: string}> },
    { "type": "comparisonTable", "headers": string[], "rows": Array<Array<string>> },
    { "type": "faq", "title": "...", "items": Array<{question: string, answer: string}> },
    ...
  ]
}

Available section types (use EXACTLY these type names):
1. hero: { type: "hero", title: string, subtitle?: string, image?: string, cta?: { label: string, url: string } }
2. paragraph: { type: "paragraph", text: string }
3. grid: { type: "grid", columns: number (1-4), items: Array<{title: string, text: string, image?: string}> }
4. infoBox: { type: "infoBox", title: string, text: string, variant?: "info"|"warning"|"success" }
5. cta: { type: "cta", text: string, link: string, variant?: "primary"|"secondary" }
6. imageBlock: { type: "imageBlock", image: string, caption?: string }
7. featureList: { type: "featureList", items: Array<{title: string, description: string, image: string}> }
8. comparisonTable: { type: "comparisonTable", headers: string[], rows: Array<Array<string>> }
9. faq: { type: "faq", title?: string, items: Array<{question: string, answer: string}> }

Content to convert:
${content.substring(0, 3000)}
${styleInstructions}

SEO OPTIMIZATION REQUIREMENTS:
- Use proper heading hierarchy (H1 in hero, H2 in sections)
- Include relevant images with descriptive alt text
- Create engaging CTAs that encourage user interaction
- Structure content for featured snippets (clear answers, lists, tables)
- Ensure content is scannable with proper spacing

IMPORTANT RULES:
- Always start with a "hero" section if the content has a main title
- Use "paragraph" sections for text content (break long paragraphs into multiple sections)
- Use "grid" for lists of items/features (2-4 columns based on content)
- Use "infoBox" for important callouts or tips
- Use "cta" strategically for call-to-action buttons (not too many)
- Use "imageBlock" every 500-700 words for visual engagement
- Use "featureList" for benefits, features, or key points
- Use "comparisonTable" for comparisons or data tables
- CRITICAL: If the content contains an FAQ section (with questions and answers), convert it to a "faq" section type with items array containing {question, answer} objects
- Return ONLY valid JSON, no markdown code blocks, no explanations
- The root object MUST have a "sections" array
- Each section MUST have a "type" field matching one of the 9 types above
- Aim for 5-10 sections total for optimal engagement

TEXT LENGTH REQUIREMENTS (CRITICAL):
- "paragraph" sections: Each paragraph section MUST contain 150-300 words of substantial, informative text. Do NOT use short 1-2 sentence paragraphs. Write comprehensive, detailed paragraphs that fully explain concepts.
- "grid" items: Each item in a grid MUST have a "text" field with at least 80-120 words describing the feature/item in detail. Include explanations, benefits, and examples.
- "featureList" items: Each item's "description" field MUST be at least 100-150 words with detailed explanations, not just brief bullet points. Include examples, benefits, and practical applications.
- "infoBox" sections: The "text" field MUST contain 100-200 words of substantial information, explanations, or tips. Do not use short one-sentence text.
- "hero" subtitle: The subtitle should be 2-3 sentences (30-60 words) providing context and value proposition.

Remember: Each section should contain substantial, valuable content that provides real information to readers. Short, minimal text is not acceptable.

Example output format:
{
  "sections": [
    {
      "type": "hero",
      "title": "Main Title",
      "subtitle": "Subtitle text",
      "image": ""
    },
    {
      "type": "paragraph",
      "text": "Paragraph content here"
    },
    {
      "type": "grid",
      "columns": 3,
      "items": [
        {
          "title": "Item 1",
          "text": "Description 1",
          "image": ""
        }
      ]
    }
  ]
}`;

      const responseContent = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        systemPrompt: 'You are a UX designer and content writer. You MUST return ONLY valid JSON objects with the exact structure: { "sections": [...] }. Each section must have a "type" field matching: hero, paragraph, grid, infoBox, cta, imageBlock, featureList, comparisonTable, or faq. CRITICAL: If the content contains FAQ questions and answers (typically under "Frequently Asked Questions" heading), convert them to a "faq" section type with items array. All text fields (paragraph text, grid item text, featureList descriptions, infoBox text, faq answers) MUST contain substantial content (150-300 words for paragraphs, 80-120 words for grid items, 100-150 words for featureList descriptions, 100-200 words for infoBox, 100-150 words for each FAQ answer). Do not create short, minimal text. Return ONLY JSON, no markdown, no explanations.',
        temperature: 0.7,
        maxTokens: 6000,
        jsonMode: true
      });
      
      // Clean JSON (remove markdown code blocks if present)
      let jsonContent = responseContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      let layout;
      try {
        layout = JSON.parse(jsonContent);
        console.log('AI-generated layout:', layout);
      } catch (e) {
        console.error('Failed to parse AI-generated layout:', e);
        console.error('Raw response:', responseContent);
        layout = getDefaultUXLayout();
      }

      // Normalize layout to ensure it has the correct structure
      layout = this.normalizeLayout(layout);

      // Validate the layout
      const validation = validateUXLayout(layout);
      if (!validation.valid) {
        console.warn('Layout validation failed:', validation.errors);
        // Try to fix common issues
        layout = this.fixLayoutStructure(layout);
      }

      return layout;
    } catch (error) {
      console.error('Error generating UX layout:', error);
      // Return default layout on error
      return getDefaultUXLayout();
    }
  }

  /**
   * Normalize layout to ensure it has { sections: [...] } structure
   */
  static normalizeLayout(layout) {
    // If layout is already in correct format
    if (layout && layout.sections && Array.isArray(layout.sections)) {
      return layout;
    }

    // If layout is an array directly, wrap it
    if (Array.isArray(layout)) {
      return { sections: layout };
    }

    // If layout has other structure, try to extract sections
    if (layout && typeof layout === 'object') {
      // Check if sections exist under different key
      if (layout.components && Array.isArray(layout.components)) {
        return { sections: layout.components };
      }
      if (layout.items && Array.isArray(layout.items)) {
        return { sections: layout.items };
      }
    }

    // Fallback to default
    return getDefaultUXLayout();
  }

  /**
   * Fix common layout structure issues
   */
  static fixLayoutStructure(layout) {
    const normalized = this.normalizeLayout(layout);
    
    // Ensure all sections have a type field
    if (normalized.sections && Array.isArray(normalized.sections)) {
      normalized.sections = normalized.sections.map((section, index) => {
        if (!section.type) {
          // Try to infer type from section properties
          if (section.title && section.subtitle) {
            section.type = 'hero';
          } else if (section.text && !section.title) {
            section.type = 'paragraph';
          } else if (section.items && Array.isArray(section.items)) {
            section.type = section.columns ? 'grid' : 'featureList';
          } else {
            section.type = 'paragraph'; // Default fallback
          }
        }
        return section;
      });
    }

    return normalized;
  }

  /**
   * Validate UX layout
   */
  static validateLayout(uxLayout) {
    return validateUXLayout(uxLayout);
  }
}

