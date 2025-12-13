import { NavigationService } from '../services/NavigationService.js';

export class NavigationController {
  /**
   * Get navigation for a tenant (for Next.js SSR)
   * Returns: { logo, menu: [{ label, slug }], cta: { label, url } }
   */
  static async getNavigation(req, res, next) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const navigation = await NavigationService.getNavigation(tenantId);
      res.json(navigation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update navigation for a tenant
   */
  static async upsertNavigation(req, res, next) {
    try {
      const { tenantId } = req.params;
      const { logo, menu, cta } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const navigation = await NavigationService.upsertNavigation(tenantId, {
        logo,
        menu,
        cta
      });
      
      res.json(navigation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete navigation for a tenant
   */
  static async deleteNavigation(req, res, next) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const navigation = await NavigationService.deleteNavigation(tenantId);
      
      if (!navigation) {
        return res.status(404).json({ error: 'Navigation not found' });
      }
      
      res.json({ message: 'Navigation deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

