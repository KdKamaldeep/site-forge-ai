/**
 * Pillar Routes
 * API endpoints for pillar generation
 */

import express from 'express';
import { PillarController } from '../controllers/pillarController.js';

const router = express.Router();

/**
 * POST /api/pillar/run/:domainOrTenantId
 * Trigger pillar generation run
 */
router.post('/run/:domainOrTenantId', PillarController.runGeneration);

export default router;

