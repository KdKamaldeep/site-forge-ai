/**
 * Pillar Controller
 * Handles pillar generation API requests
 */

import { GenerationService } from '../services/GenerationService.js';
import { TenantService } from '../services/TenantService.js';
import mongoose from 'mongoose';

export class PillarController {
  /**
   * Run pillar generation
   * POST /api/pillar/run/:domainOrTenantId
   */
  static async runGeneration(req, res, next) {
    try {
      const { domainOrTenantId } = req.params;
      const { count } = req.body;

      // Resolve tenant (by domain or ID)
      let tenantId = domainOrTenantId;
      let tenant = null;

      // Check if it's a domain (contains .)
      if (domainOrTenantId.includes('.')) {
        tenant = await TenantService.getTenantByDomain(domainOrTenantId);
        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }
        tenantId = tenant._id.toString();
      } else if (mongoose.Types.ObjectId.isValid(domainOrTenantId)) {
        tenant = await TenantService.getTenantById(domainOrTenantId);
        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }
        tenantId = domainOrTenantId;
      } else {
        return res.status(400).json({ error: 'Invalid tenant identifier' });
      }

      // Run generation
      const options = count ? { count: parseInt(count) } : {};
      const result = await GenerationService.runPillarGenerationForTenant(tenantId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Pillar generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

