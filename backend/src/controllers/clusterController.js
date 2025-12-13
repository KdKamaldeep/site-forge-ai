/**
 * Cluster Controller
 * Handles keyword cluster API requests
 */

import { ClusterService } from '../services/ClusterService.js';
import { PillarService } from '../services/PillarService.js';
import mongoose from 'mongoose';

export class ClusterController {
  /**
   * Get cluster for active pillar
   * GET /api/clusters/:tenantId/:categoryKey/:pillarKeyword
   */
  static async getCluster(req, res, next) {
    try {
      const { tenantId, categoryKey, pillarKeyword } = req.params;

      if (!tenantId || !categoryKey || !pillarKeyword) {
        return res.status(400).json({ error: 'tenantId, categoryKey, and pillarKeyword are required' });
      }

      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return res.status(400).json({ error: 'Invalid tenantId format' });
      }

      const cluster = await ClusterService.getOrCreateCluster(tenantId);
      
      // Verify it matches the requested pillar
      if (cluster.categoryKey !== categoryKey || cluster.pillarKeyword !== pillarKeyword) {
        return res.status(404).json({ error: 'Cluster not found for this pillar' });
      }

      res.json(cluster);
    } catch (error) {
      next(error);
    }
  }
}

