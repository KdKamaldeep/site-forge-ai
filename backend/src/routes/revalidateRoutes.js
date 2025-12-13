import express from 'express';
import { RevalidateController } from '../controllers/revalidateController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/revalidate:
 *   post:
 *     summary: Revalidate Next.js ISR cache
 *     description: Triggers Next.js ISR revalidation for a specific page. Calls Vercel revalidate endpoint.
 *     tags: [Revalidate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RevalidateRequest'
 *           example:
 *             tenantId: "507f1f77bcf86cd799439011"
 *             slug: "about-us"
 *     responses:
 *       200:
 *         description: Revalidation successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RevalidateResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, RevalidateController.revalidate);

export default router;

