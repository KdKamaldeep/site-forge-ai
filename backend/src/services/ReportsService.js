import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TenantService } from './TenantService.js';
import { PageService } from './PageService.js';
import PageSearchMetricsWeekly from '../models/PageSearchMetricsWeekly.js';
import PageVersion from '../models/PageVersion.js';
import { SiteOptimizationService } from './SiteOptimizationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReportsService {
  /**
   * Generate weekly report for a tenant
   */
  static async generateWeeklyReport(tenantId, weekStartDate = null) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Default to last week
    if (!weekStartDate) {
      weekStartDate = new Date();
      weekStartDate.setDate(weekStartDate.getDate() - 7);
      weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Monday
    }

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // Get metrics for the week
    const metrics = await PageSearchMetricsWeekly.find({
      tenantId,
      weekStartDate: { $gte: weekStartDate, $lte: weekEndDate }
    }).populate('pageId');

    // Get page versions created this week
    const versions = await PageVersion.find({
      tenantId,
      createdAt: { $gte: weekStartDate, $lte: weekEndDate }
    }).populate('pageId');

    // Get all pages
    const pagesList = await PageService.listPagesForTenant(tenantId);
    const totalPages = pagesList.pages?.length || 0;

    // Aggregate metrics
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCTR = 0;
    let avgPosition = 0;
    let positionCount = 0;

    metrics.forEach(metric => {
      totalImpressions += metric.impressions || 0;
      totalClicks += metric.clicks || 0;
      if (metric.avgPosition) {
        avgPosition += metric.avgPosition;
        positionCount += 1;
      }
    });

    const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const overallAvgPosition = positionCount > 0 ? avgPosition / positionCount : null;

    // Top performing pages
    const topPages = metrics
      .map(m => ({
        pageId: m.pageId?._id?.toString() || m.pageId?.toString(),
        pageSlug: m.pageSlug,
        impressions: m.impressions,
        clicks: m.clicks,
        ctr: m.ctr,
        avgPosition: m.avgPosition
      }))
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 10);

    // Optimization summary
    const optimizations = {
      total: versions.length,
      byType: {},
      titlesRewritten: versions.filter(v => v.optimizationType === 'ctr_improvement').length,
      contentExpanded: versions.filter(v => v.optimizationType === 'content_expansion').length,
      internalLinksAdded: versions.filter(v => v.optimizationType === 'internal_links').length
    };

    versions.forEach(v => {
      const type = v.optimizationType || 'unknown';
      optimizations.byType[type] = (optimizations.byType[type] || 0) + 1;
    });

    // Cannibalization report
    const cannibalization = await SiteOptimizationService.detectCannibalization(tenantId);

    const report = {
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        domain: tenant.domain
      },
      period: {
        weekStart: weekStartDate.toISOString(),
        weekEnd: weekEndDate.toISOString(),
        generatedAt: new Date().toISOString()
      },
      summary: {
        totalPages,
        totalImpressions,
        totalClicks,
        overallCTR: overallCTR.toFixed(2),
        overallAvgPosition: overallAvgPosition ? overallAvgPosition.toFixed(1) : null,
        pagesWithMetrics: metrics.length
      },
      topPages,
      optimizations,
      cannibalization: {
        detected: cannibalization.length > 0,
        count: cannibalization.length,
        issues: cannibalization.slice(0, 10) // Top 10
      },
      recommendations: this.generateRecommendations(metrics, versions, cannibalization)
    };

    // Save to file
    const reportsDir = path.join(__dirname, '../../reports', tenant.domain);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFileName = `report-${weekStartDate.toISOString().split('T')[0]}.json`;
    const reportPath = path.join(reportsDir, reportFileName);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return {
      report,
      filePath: reportPath
    };
  }

  /**
   * Generate recommendations based on data
   */
  static generateRecommendations(metrics, versions, cannibalization) {
    const recommendations = [];

    // Low CTR pages
    const lowCTRPages = metrics.filter(m => m.impressions > 500 && m.ctr < 1.5);
    if (lowCTRPages.length > 0) {
      recommendations.push({
        type: 'ctr_improvement',
        priority: 'high',
        message: `${lowCTRPages.length} pages have low CTR (< 1.5%). Consider rewriting titles and meta descriptions.`,
        affectedPages: lowCTRPages.length
      });
    }

    // Pages in positions 8-15
    const midPositionPages = metrics.filter(m => m.avgPosition >= 8 && m.avgPosition <= 15);
    if (midPositionPages.length > 0) {
      recommendations.push({
        type: 'content_expansion',
        priority: 'medium',
        message: `${midPositionPages.length} pages are in positions 8-15. Expand content to improve rankings.`,
        affectedPages: midPositionPages.length
      });
    }

    // Cannibalization
    if (cannibalization.length > 0) {
      recommendations.push({
        type: 'cannibalization',
        priority: 'high',
        message: `${cannibalization.length} queries have multiple pages competing. Consider consolidating or adjusting targeting.`,
        affectedQueries: cannibalization.length
      });
    }

    // Pages with no metrics (new pages)
    const newPages = versions.filter(v => v.status === 'published').length;
    if (newPages > 0) {
      recommendations.push({
        type: 'new_content',
        priority: 'low',
        message: `${newPages} new pages published this week. Monitor performance in coming weeks.`,
        affectedPages: newPages
      });
    }

    return recommendations;
  }

  /**
   * Get latest report for a tenant
   */
  static async getLatestReport(tenantId) {
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const reportsDir = path.join(__dirname, '../../reports', tenant.domain);
    if (!fs.existsSync(reportsDir)) {
      return null;
    }

    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('report-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return null;
    }

    const latestFile = files[0];
    const reportPath = path.join(reportsDir, latestFile);
    const reportContent = fs.readFileSync(reportPath, 'utf-8');

    return JSON.parse(reportContent);
  }
}

