import express from 'express';
import { TenantController } from '../controllers/tenantController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/tenants/domain/{domain}:
 *   get:
 *     summary: Get tenant by domain (for Next.js SSR)
 *     description: Resolves tenant by domain for multi-tenant routing. Returns tenant details including theme, logo, and settings.
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain (e.g., mysite.example.com)
 *     responses:
 *       200:
 *         description: Tenant found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/domain/:domain', TenantController.getByDomain);

// Protected routes
router.post('/', authMiddleware, TenantController.create);
router.get('/', authMiddleware, TenantController.list);
router.get('/:id', authMiddleware, TenantController.getById);
router.put('/:id/theme', authMiddleware, TenantController.updateTheme);
router.put('/:id/settings', authMiddleware, TenantController.updateSettings);
router.delete('/:id', authMiddleware, TenantController.delete);

export default router;

