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
 * Render sections from UX Layout JSON
 */
export function renderSections(sections) {
  if (!sections || !Array.isArray(sections)) {
    return null;
  }

  return sections.map((section, index) => {
    const Component = componentMap[section.type];

    if (!Component) {
      console.warn(`Unknown section type: ${section.type}`);
      return null;
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

