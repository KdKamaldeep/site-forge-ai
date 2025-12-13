import express from 'express';
import { SearchConsoleController } from '../controllers/searchConsoleController.js';

const router = express.Router();

/**
 * @swagger
 * /api/tenants/{tenantId}/gsc/connect:
 *   get:
 *     summary: Initiate Google Search Console OAuth flow
 *     tags: [Search Console]
 */
router.get('/:tenantId/gsc/connect', SearchConsoleController.connect);

/**
 * @swagger
 * /api/tenants/{tenantId}/gsc/callback:
 *   get:
 *     summary: OAuth callback for Google Search Console
 *     tags: [Search Console]
 */
router.get('/:tenantId/gsc/callback', SearchConsoleController.callback);

/**
 * @swagger
 * /api/tenants/{tenantId}/gsc/sync:
 *   post:
 *     summary: Sync Search Console data for a tenant
 *     tags: [Search Console]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 */
router.post('/:tenantId/gsc/sync', SearchConsoleController.sync);

/**
 * @swagger
 * /api/tenants/{tenantId}/gsc/status:
 *   get:
 *     summary: Get Search Console connection status
 *     tags: [Search Console]
 */
router.get('/:tenantId/gsc/status', SearchConsoleController.getStatus);

export default router;

