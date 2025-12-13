/**
 * Layout Style Definitions
 * 10 different layout styles for diverse tenant designs
 * Each style has unique characteristics for visual variety
 */

export const LAYOUT_STYLES = {
  // 1. Modern Minimal - Clean, spacious, lots of white space
  modernMinimal: {
    name: 'Modern Minimal',
    description: 'Clean, spacious design with lots of white space',
    characteristics: [
      'Large hero sections with minimal text',
      'Generous spacing between elements',
      'Simple typography',
      'Minimal color palette',
      'Focus on content readability'
    ],
    sectionPreferences: {
      hero: { style: 'large', image: true, subtitle: true },
      paragraph: { spacing: 'large', maxWidth: 'narrow' },
      grid: { columns: 2, spacing: 'large' },
      cta: { style: 'minimal', variant: 'secondary' }
    }
  },

  // 2. Bold & Vibrant - High contrast, bold colors, energetic
  boldVibrant: {
    name: 'Bold & Vibrant',
    description: 'High contrast design with bold colors and energetic feel',
    characteristics: [
      'Vibrant color schemes',
      'Bold typography',
      'High contrast elements',
      'Energetic CTAs',
      'Eye-catching visuals'
    ],
    sectionPreferences: {
      hero: { style: 'bold', image: true, cta: true },
      paragraph: { spacing: 'medium', emphasis: true },
      grid: { columns: 3, colorful: true },
      cta: { style: 'bold', variant: 'primary' }
    }
  },

  // 3. Professional Corporate - Formal, trustworthy, business-focused
  professionalCorporate: {
    name: 'Professional Corporate',
    description: 'Formal, trustworthy design for business content',
    characteristics: [
      'Professional color schemes',
      'Structured layouts',
      'Clear hierarchy',
      'Trust indicators',
      'Formal typography'
    ],
    sectionPreferences: {
      hero: { style: 'professional', image: true, subtitle: true },
      paragraph: { spacing: 'medium', structured: true },
      grid: { columns: 2, professional: true },
      infoBox: { variant: 'info', frequent: true },
      cta: { style: 'professional', variant: 'primary' }
    }
  },

  // 4. Magazine Style - Editorial, content-rich, visual storytelling
  magazineStyle: {
    name: 'Magazine Style',
    description: 'Editorial design with rich content and visual storytelling',
    characteristics: [
      'Large featured images',
      'Multi-column layouts',
      'Rich typography',
      'Visual storytelling',
      'Content-focused'
    ],
    sectionPreferences: {
      hero: { style: 'editorial', image: true, large: true },
      paragraph: { spacing: 'medium', rich: true },
      grid: { columns: 3, visual: true },
      imageBlock: { frequent: true, large: true },
      cta: { style: 'subtle', variant: 'secondary' }
    }
  },

  // 5. Tech Modern - Futuristic, sleek, innovation-focused
  techModern: {
    name: 'Tech Modern',
    description: 'Futuristic, sleek design for tech and innovation',
    characteristics: [
      'Sleek modern aesthetics',
      'Tech-inspired elements',
      'Innovation-focused',
      'Clean lines',
      'Modern typography'
    ],
    sectionPreferences: {
      hero: { style: 'tech', image: true, futuristic: true },
      paragraph: { spacing: 'medium', modern: true },
      grid: { columns: 3, tech: true },
      featureList: { frequent: true, modern: true },
      cta: { style: 'modern', variant: 'primary' }
    }
  },

  // 6. Creative Artistic - Unique, artistic, expressive
  creativeArtistic: {
    name: 'Creative Artistic',
    description: 'Unique, artistic design with expressive elements',
    characteristics: [
      'Artistic layouts',
      'Unique compositions',
      'Expressive typography',
      'Creative imagery',
      'Unconventional structures'
    ],
    sectionPreferences: {
      hero: { style: 'artistic', image: true, creative: true },
      paragraph: { spacing: 'variable', artistic: true },
      grid: { columns: 'variable', creative: true },
      imageBlock: { frequent: true, artistic: true },
      cta: { style: 'creative', variant: 'primary' }
    }
  },

  // 7. E-commerce Focused - Product-oriented, conversion-focused
  ecommerceFocused: {
    name: 'E-commerce Focused',
    description: 'Product-oriented design optimized for conversions',
    characteristics: [
      'Product showcases',
      'Clear CTAs',
      'Trust badges',
      'Comparison tables',
      'Conversion optimization'
    ],
    sectionPreferences: {
      hero: { style: 'product', image: true, cta: true },
      grid: { columns: 4, product: true },
      comparisonTable: { frequent: true },
      featureList: { frequent: true, benefits: true },
      cta: { style: 'prominent', variant: 'primary', frequent: true }
    }
  },

  // 8. Educational - Learning-focused, structured, informative
  educational: {
    name: 'Educational',
    description: 'Learning-focused design with structured, informative layouts',
    characteristics: [
      'Clear information hierarchy',
      'Educational content structure',
      'Step-by-step guides',
      'Informative visuals',
      'Learning-focused'
    ],
    sectionPreferences: {
      hero: { style: 'educational', subtitle: true },
      paragraph: { spacing: 'medium', structured: true },
      infoBox: { frequent: true, variant: 'info' },
      featureList: { frequent: true, educational: true },
      comparisonTable: { frequent: true },
      cta: { style: 'educational', variant: 'secondary' }
    }
  },

  // 9. News/Blog - Content-first, readable, article-focused
  newsBlog: {
    name: 'News/Blog',
    description: 'Content-first design optimized for articles and blog posts',
    characteristics: [
      'Article-focused layouts',
      'Readable typography',
      'Content hierarchy',
      'Related content',
      'Social sharing focus'
    ],
    sectionPreferences: {
      hero: { style: 'article', image: true },
      paragraph: { spacing: 'comfortable', readable: true },
      imageBlock: { frequent: true, article: true },
      infoBox: { variant: 'info', occasional: true },
      cta: { style: 'subtle', variant: 'secondary' }
    }
  },

  // 10. Portfolio Showcase - Visual portfolio, project-focused
  portfolioShowcase: {
    name: 'Portfolio Showcase',
    description: 'Visual portfolio design for showcasing work and projects',
    characteristics: [
      'Visual-first layouts',
      'Portfolio showcases',
      'Project highlights',
      'Visual storytelling',
      'Showcase-focused'
    ],
    sectionPreferences: {
      hero: { style: 'showcase', image: true, large: true },
      grid: { columns: 3, visual: true, showcase: true },
      imageBlock: { frequent: true, large: true },
      featureList: { frequent: true, project: true },
      cta: { style: 'showcase', variant: 'primary' }
    }
  }
};

/**
 * Get layout style by name or index
 */
export function getLayoutStyle(styleNameOrIndex) {
  if (typeof styleNameOrIndex === 'number') {
    const styles = Object.values(LAYOUT_STYLES);
    return styles[styleNameOrIndex % styles.length];
  }
  return LAYOUT_STYLES[styleNameOrIndex] || LAYOUT_STYLES.modernMinimal;
}

/**
 * Get random layout style
 */
export function getRandomLayoutStyle() {
  const styles = Object.values(LAYOUT_STYLES);
  return styles[Math.floor(Math.random() * styles.length)];
}

/**
 * Get layout style for tenant (can be assigned or random)
 */
export function getTenantLayoutStyle(tenant) {
  // Check if tenant has a preferred style in settings
  if (tenant.settings?.layoutStyle) {
    return getLayoutStyle(tenant.settings.layoutStyle);
  }
  
  // Use tenant index or hash to assign consistent style
  // This ensures same tenant always gets same style
  const tenantHash = tenant._id?.toString().charCodeAt(0) || 0;
  const styleIndex = tenantHash % Object.keys(LAYOUT_STYLES).length;
  return getLayoutStyle(styleIndex);
}

