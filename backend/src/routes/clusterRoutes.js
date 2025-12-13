/**
 * Cluster Routes
 * API endpoints for keyword clusters
 */

import express from 'express';
import { ClusterController } from '../controllers/clusterController.js';

const router = express.Router();

/**
 * GET /api/clusters/:tenantId/:categoryKey/:pillarKeyword
 * Get keyword cluster for a pillar
 */
router.get('/:tenantId/:categoryKey/:pillarKeyword', ClusterController.getCluster);

export default router;

