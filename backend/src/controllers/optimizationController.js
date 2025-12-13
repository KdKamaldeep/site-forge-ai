import { SiteOptimizationService } from '../services/SiteOptimizationService.js';

export class OptimizationController {
  /**
   * Rollback page to a specific version
   * POST /api/pages/:pageId/rollback/:version
   */
  static async rollback(req, res, next) {
    try {
      const { pageId, version } = req.params;
      const versionNumber = parseInt(version, 10);

      if (isNaN(versionNumber)) {
        return res.status(400).json({ error: 'Invalid version number' });
      }

      const rolledBack = await SiteOptimizationService.rollbackToVersion(pageId, versionNumber);
      
      res.json({
        success: true,
        message: `Page rolled back to version ${versionNumber}`,
        version: rolledBack
      });
    } catch (error) {
      next(error);
    }
  }
}

