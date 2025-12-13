/**
 * UX Designer Agent
 * Specializes in converting content into optimal UX layouts
 */

import { UXLayoutService } from '../services/UXLayoutService.js';
import { validateUXLayout } from '../utils/uxSchemaValidator.js';

export class UXDesignerAgent {
  /**
   * Design UX layout from content
   */
  static async designLayout(content, style = 'standard', preferences = {}) {
    try {
      // Generate base layout
      let layout = await UXLayoutService.generateUXLayout(content, style);

      // Apply preferences if provided
      if (preferences.layout) {
        layout.layout = preferences.layout;
      }

      if (preferences.sections) {
        layout.sections = preferences.sections;
      }

      // Validate the layout
      const validation = validateUXLayout(layout);
      if (!validation.valid) {
        console.warn('Layout validation warnings:', validation.errors);
      }

      return layout;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Optimize existing layout
   */
  static async optimizeLayout(existingLayout, content) {
    try {
      // Analyze content and suggest improvements
      const optimized = await UXLayoutService.generateUXLayout(content);
      
      // Merge with existing layout preferences
      return {
        ...existingLayout,
        sections: optimized.sections
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Suggest component hierarchy
   */
  static suggestHierarchy(contentLength) {
    if (contentLength < 500) {
      return {
        layout: 'MinimalArticle',
        recommendedSections: ['hero', 'paragraph', 'cta']
      };
    } else if (contentLength < 1500) {
      return {
        layout: 'StandardArticle',
        recommendedSections: ['hero', 'paragraph', 'infoBox', 'paragraph', 'cta']
      };
    } else {
      return {
        layout: 'ModernArticle',
        recommendedSections: ['hero', 'paragraph', 'grid', 'infoBox', 'featureList', 'paragraph', 'cta']
      };
    }
  }
}

