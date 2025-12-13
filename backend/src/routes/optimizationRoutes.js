import express from 'express';
import { OptimizationController } from '../controllers/optimizationController.js';

const router = express.Router();

/**
 * @swagger
 * /api/pages/{pageId}/rollback/{version}:
 *   post:
 *     summary: Rollback page to a specific version
 *     tags: [Optimization]
 */
router.post('/:pageId/rollback/:version', OptimizationController.rollback);

export default router;

