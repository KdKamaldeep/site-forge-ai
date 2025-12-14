import express from 'express';
import { PageController } from '../controllers/pageController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// IMPORTANT: Specific routes must come BEFORE generic routes
// Otherwise Express will match /home/:tenantId to /:tenantId/:slug

/**
 * @swagger
 * /api/pages/home/{tenantId}:
 *   get:
 *     summary: Get homepage for tenant
 *     description: Fetches the homepage (where isHome=true) for a tenant. Returns same structure as page fetch.
 *     tags: [Pages]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Homepage found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Page'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Homepage not found
 */
router.get('/home/:tenantId', PageController.getHomePage);

/**
 * @swagger
 * /api/pages/list/{tenantId}:
 *   get:
 *     summary: List all pages for tenant (for sitemap/menus)
 *     description: Returns all pages for a tenant, sorted alphabetically by title. Returns only slug and title.
 *     tags: [Pages]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Pages list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PageList'
 *       400:
 *         description: Bad request
 */
router.get('/list/:tenantId', PageController.listPages);

/**
 * @swagger
 * /api/pages/category/{tenantId}/{categoryKey}:
 *   get:
 *     summary: List pages by category
 *     description: Returns paginated list of pages for a specific category
 *     tags: [Pages]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: categoryKey
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Pages list
 */
router.get('/category/:tenantId/:categoryKey', PageController.listByCategory);

/**
 * @swagger
 * /api/pages/standalone/{tenantId}:
 *   get:
 *     summary: Get standalone pages for tenant
 *     description: Returns standalone pages (Privacy Policy, About Us, Contact, Cookie Disclosure) for footer links
 *     tags: [Pages]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Standalone pages list
 */
router.get('/standalone/:tenantId', PageController.getStandalonePages);

/**
 * @swagger
 * /api/pages/{tenantId}/{slug}:
 *   get:
 *     summary: Get page by slug (for Next.js SSR)
 *     description: Fetches a page by tenant ID and slug for SSR rendering. Returns page content, metadata, and UX layout.
 *     tags: [Pages]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Page slug
 *     responses:
 *       200:
 *         description: Page found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Page'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Page not found
 */
router.get('/:tenantId/:slug', PageController.getBySlug);

// Protected routes - manage pages
router.post('/', authMiddleware, PageController.create);
router.get('/id/:id', authMiddleware, PageController.getById);
router.put('/:id', authMiddleware, PageController.update);
router.delete('/:id', authMiddleware, PageController.delete);

export default router;

