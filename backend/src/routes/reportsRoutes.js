import express from 'express';
import { ReportsController } from '../controllers/reportsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/tenants/{tenantId}/reports/latest:
 *   get:
 *     summary: Get latest weekly report for a tenant
 *     tags: [Reports]
 */
router.get('/:tenantId/reports/latest', ReportsController.getLatest);

/**
 * @swagger
 * /api/tenants/{tenantId}/reports/generate:
 *   post:
 *     summary: Generate weekly report for a tenant
 *     tags: [Reports]
 */
router.post('/:tenantId/reports/generate', ReportsController.generate);

export default router;

