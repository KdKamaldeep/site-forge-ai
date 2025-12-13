import express from 'express';
import { NavigationController } from '../controllers/navigationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/navigation/{tenantId}:
 *   get:
 *     summary: Get navigation configuration for tenant
 *     description: Returns navigation configuration (logo, menu, CTA) for a tenant. Auto-generates menu from pages if no navigation exists.
 *     tags: [Navigation]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Navigation configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Navigation'
 *       400:
 *         description: Bad request
 */
router.get('/:tenantId', NavigationController.getNavigation);

// Protected routes - manage navigation
router.post('/:tenantId', authMiddleware, NavigationController.upsertNavigation);
router.put('/:tenantId', authMiddleware, NavigationController.upsertNavigation);
router.delete('/:tenantId', authMiddleware, NavigationController.deleteNavigation);

export default router;

