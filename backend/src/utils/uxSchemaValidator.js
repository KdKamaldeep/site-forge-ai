/**
 * UX Layout JSON Schema Validator
 */

const VALID_SECTION_TYPES = [
  'hero',
  'paragraph',
  'grid',
  'infoBox',
  'cta',
  'imageBlock',
  'featureList',
  'comparisonTable'
];

const VALID_LAYOUTS = [
  'StandardArticle',
  'MinimalArticle',
  'ModernArticle',
  'ClassicArticle'
];

/**
 * Validate UX Layout JSON structure
 */
export function validateUXLayout(uxLayout) {
  const errors = [];

  if (!uxLayout) {
    return { valid: false, errors: ['UX Layout is required'] };
  }

  // Layout field is optional (frontend doesn't use it, only sections)
  if (uxLayout.layout && !VALID_LAYOUTS.includes(uxLayout.layout)) {
    errors.push(`Invalid layout type. Must be one of: ${VALID_LAYOUTS.join(', ')}`);
  }

  // Sections array is required and must be an array
  if (!uxLayout.sections) {
    errors.push('Sections array is required');
  } else if (!Array.isArray(uxLayout.sections)) {
    errors.push('Sections must be an array');
  } else {
    uxLayout.sections.forEach((section, index) => {
      if (!section.type) {
        errors.push(`Section ${index}: type is required`);
      } else if (!VALID_SECTION_TYPES.includes(section.type)) {
        errors.push(`Section ${index}: invalid type "${section.type}". Must be one of: ${VALID_SECTION_TYPES.join(', ')}`);
      }

      // Validate section-specific requirements
      switch (section.type) {
        case 'hero':
          if (!section.title) errors.push(`Section ${index} (hero): title is required`);
          break;
        case 'paragraph':
          if (!section.text) errors.push(`Section ${index} (paragraph): text is required`);
          break;
        case 'grid':
          if (!section.columns) errors.push(`Section ${index} (grid): columns is required`);
          if (!section.items || !Array.isArray(section.items)) {
            errors.push(`Section ${index} (grid): items array is required`);
          }
          break;
        case 'infoBox':
          if (!section.title) errors.push(`Section ${index} (infoBox): title is required`);
          if (!section.text) errors.push(`Section ${index} (infoBox): text is required`);
          break;
        case 'cta':
          if (!section.text) errors.push(`Section ${index} (cta): text is required`);
          break;
        case 'imageBlock':
          if (!section.image) errors.push(`Section ${index} (imageBlock): image URL is required`);
          break;
        case 'featureList':
          if (!section.items || !Array.isArray(section.items)) {
            errors.push(`Section ${index} (featureList): items array is required`);
          }
          break;
        case 'comparisonTable':
          if (!section.headers || !Array.isArray(section.headers)) {
            errors.push(`Section ${index} (comparisonTable): headers array is required`);
          }
          if (!section.rows || !Array.isArray(section.rows)) {
            errors.push(`Section ${index} (comparisonTable): rows array is required`);
          }
          break;
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get default UX layout structure
 */
export function getDefaultUXLayout() {
  return {
    sections: []
  };
}

