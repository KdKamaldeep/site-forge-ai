import { ThemeService } from '../services/ThemeService.js';

/**
 * Middleware to load theme for tenant
 * Should be used after tenantResolver
 */
export async function themeResolver(req, res, next) {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant must be resolved first' });
    }

    if (req.tenant.themeId) {
      const theme = await ThemeService.getThemeById(req.tenant.themeId);
      req.theme = theme;
    } else {
      req.theme = null;
    }

    next();
  } catch (error) {
    console.error('Theme resolver error:', error);
    res.status(500).json({ error: 'Failed to resolve theme' });
  }
}

