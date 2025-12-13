import { ThemeService } from '../services/ThemeService.js';

export class ThemeController {
  /**
   * Create a new theme
   */
  static async create(req, res, next) {
    try {
      const theme = await ThemeService.createTheme(req.body);
      res.status(201).json(theme);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get theme by ID
   */
  static async getById(req, res, next) {
    try {
      const theme = await ThemeService.getThemeById(req.params.id);
      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }
      res.json(theme);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all themes
   */
  static async list(req, res, next) {
    try {
      const themes = await ThemeService.listThemes();
      res.json(themes);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update theme
   */
  static async update(req, res, next) {
    try {
      const theme = await ThemeService.updateTheme(req.params.id, req.body);
      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }
      res.json(theme);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete theme
   */
  static async delete(req, res, next) {
    try {
      const theme = await ThemeService.deleteTheme(req.params.id);
      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }
      res.json({ message: 'Theme deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

