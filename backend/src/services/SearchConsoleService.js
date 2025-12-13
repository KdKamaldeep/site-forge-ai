import { google } from 'googleapis';
import SearchConsoleProperty from '../models/SearchConsoleProperty.js';
import PageSearchMetricsWeekly from '../models/PageSearchMetricsWeekly.js';
import { TenantService } from './TenantService.js';
import { PageService } from './PageService.js';

export class SearchConsoleService {
  /**
   * Get OAuth2 client for Google Search Console
   */
  static getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/tenants/:tenantId/gsc/callback';

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate OAuth2 authorization URL
   */
  static getAuthUrl(tenantId) {
    const oauth2Client = this.getOAuth2Client();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:5000/api/tenants/${tenantId}/gsc/callback`;

    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: tenantId.toString(), // Pass tenantId in state for callback
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Get authenticated client for a tenant
   */
  static async getAuthenticatedClient(tenantId) {
    const property = await SearchConsoleProperty.findOne({ tenantId });
    if (!property || !property.refreshToken) {
      throw new Error('Search Console not connected for this tenant');
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: property.refreshToken
    });

    return oauth2Client;
  }

  /**
   * Connect GSC for a tenant (store refresh token)
   */
  static async connectTenant(tenantId, refreshToken, siteUrl) {
    const existing = await SearchConsoleProperty.findOne({ tenantId });
    
    if (existing) {
      existing.refreshToken = refreshToken;
      existing.siteUrl = siteUrl;
      existing.verified = true;
      return await existing.save();
    }

    return await SearchConsoleProperty.create({
      tenantId,
      refreshToken,
      siteUrl,
      verified: true
    });
  }

  /**
   * Sync Search Console data for a tenant
   */
  static async syncTenantData(tenantId, fromDate, toDate) {
    try {
      const tenant = await TenantService.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const property = await SearchConsoleProperty.findOne({ tenantId });
      if (!property || !property.verified) {
        throw new Error('Search Console not connected for this tenant');
      }

      const oauth2Client = await this.getAuthenticatedClient(tenantId);
      const searchconsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client
      });

      // Get all pages for this tenant
      const pagesList = await PageService.listPagesForTenant(tenantId);
      const pages = pagesList.pages || [];

      // Calculate week start dates
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      const weekStarts = [];

      // Get all week start dates in range (Monday of each week)
      let current = new Date(startDate);
      current.setDate(current.getDate() - current.getDay() + 1); // Start of week (Monday)
      
      while (current <= endDate) {
        weekStarts.push(new Date(current));
        current.setDate(current.getDate() + 7);
      }

      const results = {
        pagesProcessed: 0,
        metricsCreated: 0,
        errors: []
      };

      // For each page, fetch metrics
      for (const page of pages) {
        try {
          const pageUrl = `https://${tenant.domain}/${page.slug}`;
          
          // Fetch data for each week
          for (const weekStart of weekStarts) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const weekStartStr = this.formatDate(weekStart);
            const weekEndStr = this.formatDate(weekEnd);

            try {
              // Fetch search analytics data
              const response = await searchconsole.searchanalytics.query({
                siteUrl: property.siteUrl,
                requestBody: {
                  startDate: weekStartStr,
                  endDate: weekEndStr,
                  dimensions: ['page', 'query'],
                  rowLimit: 1000
                }
              });

              const rows = response.data.rows || [];
              
              // Filter rows for this specific page
              const pageRows = rows.filter(row => 
                row.keys && row.keys[0] === pageUrl
              );

              if (pageRows.length > 0) {
                // Aggregate metrics
                let totalImpressions = 0;
                let totalClicks = 0;
                let totalPosition = 0;
                let positionCount = 0;
                const topQueries = [];

                // Process query-level data
                const queryMap = {};
                pageRows.forEach(row => {
                  if (row.keys && row.keys.length >= 2) {
                    const query = row.keys[1];
                    if (!queryMap[query]) {
                      queryMap[query] = {
                        query,
                        impressions: 0,
                        clicks: 0,
                        position: 0,
                        positionCount: 0
                      };
                    }
                    queryMap[query].impressions += row.impressions || 0;
                    queryMap[query].clicks += row.clicks || 0;
                    if (row.position) {
                      queryMap[query].position += row.position;
                      queryMap[query].positionCount += 1;
                    }
                  }
                });

                // Calculate totals
                Object.values(queryMap).forEach(q => {
                  totalImpressions += q.impressions;
                  totalClicks += q.clicks;
                  if (q.positionCount > 0) {
                    totalPosition += q.position / q.positionCount;
                    positionCount += 1;
                  }

                  // Add to top queries (limit 10)
                  topQueries.push({
                    query: q.query,
                    impressions: q.impressions,
                    clicks: q.clicks,
                    ctr: q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0,
                    avgPosition: q.positionCount > 0 ? q.position / q.positionCount : null
                  });
                });

                // Sort top queries by impressions
                topQueries.sort((a, b) => b.impressions - a.impressions);
                const top10Queries = topQueries.slice(0, 10);

                const avgPosition = positionCount > 0 ? totalPosition / positionCount : null;
                const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

                // Upsert metrics
                await PageSearchMetricsWeekly.findOneAndUpdate(
                  {
                    tenantId,
                    pageId: page._id || page.id,
                    weekStartDate: weekStart
                  },
                  {
                    tenantId,
                    pageId: page._id || page.id,
                    pageSlug: page.slug,
                    weekStartDate: weekStart,
                    impressions: totalImpressions,
                    clicks: totalClicks,
                    ctr,
                    avgPosition,
                    topQueries: top10Queries
                  },
                  { upsert: true, new: true }
                );

                results.metricsCreated += 1;
              }
            } catch (weekError) {
              console.error(`Error syncing week ${weekStartStr} for page ${page.slug}:`, weekError.message);
              results.errors.push({
                page: page.slug,
                week: weekStartStr,
                error: weekError.message
              });
            }
          }

          results.pagesProcessed += 1;
        } catch (pageError) {
          console.error(`Error syncing page ${page.slug}:`, pageError.message);
          results.errors.push({
            page: page.slug,
            error: pageError.message
          });
        }
      }

      // Update last sync time
      property.lastSyncAt = new Date();
      await property.save();

      return results;
    } catch (error) {
      console.error(`Error syncing tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  static formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get metrics for a page
   */
  static async getPageMetrics(tenantId, pageId, weeks = 4) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

    return await PageSearchMetricsWeekly.find({
      tenantId,
      pageId,
      weekStartDate: { $gte: cutoffDate }
    }).sort({ weekStartDate: -1 });
  }
}

