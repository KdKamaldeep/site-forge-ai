import { ReportsService } from '../services/ReportsService.js';

export class ReportsController {
  /**
   * Get latest report for a tenant
   * GET /api/tenants/:tenantId/reports/latest
   */
  static async getLatest(req, res, next) {
    try {
      const { tenantId } = req.params;
      const report = await ReportsService.getLatestReport(tenantId);
      
      if (!report) {
        return res.status(404).json({ error: 'No reports found for this tenant' });
      }

      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate weekly report
   * POST /api/tenants/:tenantId/reports/generate
   */
  static async generate(req, res, next) {
    try {
      const { tenantId } = req.params;
      const { weekStart } = req.body;

      const weekStartDate = weekStart ? new Date(weekStart) : null;
      const result = await ReportsService.generateWeeklyReport(tenantId, weekStartDate);
      
      res.json({
        success: true,
        message: 'Report generated successfully',
        report: result.report,
        filePath: result.filePath
      });
    } catch (error) {
      next(error);
    }
  }
}

