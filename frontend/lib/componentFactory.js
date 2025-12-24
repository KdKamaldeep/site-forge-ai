/**
 * Component Factory
 * Converts UX Layout JSON to React components
 */

import Hero from '@/components/ux/Hero';
import Paragraph from '@/components/ux/Paragraph';
import Grid from '@/components/ux/Grid';
import InfoBox from '@/components/ux/InfoBox';
import CTA from '@/components/ux/CTA';
import ImageBlock from '@/components/ux/ImageBlock';
import FeatureList from '@/components/ux/FeatureList';
import ComparisonTable from '@/components/ux/ComparisonTable';
import FAQ from '@/components/ux/FAQ';
import RelatedPages from '@/components/ux/RelatedPages';

// Component mapping
const componentMap = {
  hero: Hero,
  paragraph: Paragraph,
  grid: Grid,
  infoBox: InfoBox,
  cta: CTA,
  imageBlock: ImageBlock,
  featureList: FeatureList,
  comparisonTable: ComparisonTable,
  faq: FAQ,
  relatedPages: RelatedPages,
};

/**
 * Check if a section contains a video embed (YouTube iframe)
 */
function isVideoSection(section) {
  if (section.type !== 'paragraph') {
    return false;
  }
  
  if (!section.text) {
    return false;
  }
  
  // Check if text contains YouTube iframe or video-embed class
  return section.text.includes('youtube.com/embed') || 
         section.text.includes('youtu.be') ||
         section.text.includes('video-embed') ||
         section.text.includes('<iframe');
}

/**
 * Ensure infobox appears before video sections
 * If a video section is found and there's no infobox immediately before it, insert one
 */
function ensureInfoBoxBeforeVideos(sections) {
  if (!sections || !Array.isArray(sections)) {
    return sections;
  }

  const processedSections = [];
  
  for (let i = 0; i < sections.length; i++) {
    const currentSection = sections[i];
    
    // If this is a video section
    if (isVideoSection(currentSection)) {
      // Check if previous section is an infobox
      const previousSection = i > 0 ? sections[i - 1] : null;
      const hasInfoBoxBefore = previousSection && previousSection.type === 'infoBox';
      
      // If no infobox before video, insert one
      if (!hasInfoBoxBefore) {
        processedSections.push({
          type: 'infoBox',
          title: 'Important Information',
          text: 'Watch the video below to learn more about this topic. This comprehensive guide provides essential information to help you understand the key concepts.',
          variant: 'info'
        });
      }
    }
    
    // Add the current section
    processedSections.push(currentSection);
  }
  
  return processedSections;
}

/**
 * Render sections from UX Layout JSON
 */
export function renderSections(sections) {
  if (!sections || !Array.isArray(sections)) {
    return null;
  }

  // Ensure infobox appears before videos
  const processedSections = ensureInfoBoxBeforeVideos(sections);

  return processedSections.map((section, index) => {
    // Ensure section has a type property
    if (!section || !section.type) {
      console.warn(`Section at index ${index} is missing type property:`, section);
      return null;
    }

    // Use type as-is (backend sends: 'grid', 'featureList', 'paragraph', etc.)
    const sectionType = section.type;
    const Component = componentMap[sectionType];

    if (!Component) {
      console.error(
        `❌ Unknown section type: "${sectionType}" at index ${index}. ` +
        `Available types: ${Object.keys(componentMap).join(', ')}. ` +
        `Section data:`,
        section
      );
      // Fallback to paragraph if type is unknown (for backward compatibility)
      const ParagraphComponent = componentMap['paragraph'];
      if (ParagraphComponent) {
        console.warn(`⚠️ Falling back to paragraph component for section at index ${index}`);
        return (
          <ParagraphComponent
            key={index}
            {...section}
          />
        );
      }
      return null;
    }

    // Debug log for grid and featureList to ensure they're being rendered
    if (sectionType === 'grid' || sectionType === 'featureList') {
      console.log(`✅ Rendering ${sectionType} section at index ${index}:`, {
        type: sectionType,
        hasItems: section.items ? section.items.length : 0,
        hasColumns: section.columns || 'default'
      });
    }

    return (
      <Component
        key={index}
        {...section}
      />
    );
  });
}

/**
 * Render UX Layout
 * Handles both full layout object and sections array
 */
export function renderUXLayout(uxLayout) {
  if (!uxLayout) {
    return null;
  }

  // If uxLayout has sections, render them
  if (uxLayout.sections && Array.isArray(uxLayout.sections)) {
    return renderSections(uxLayout.sections);
  }

  // If uxLayout is an array directly, render it
  if (Array.isArray(uxLayout)) {
    return renderSections(uxLayout);
  }

  return null;
}

