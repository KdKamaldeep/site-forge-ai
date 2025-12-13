import express from 'express';
import { ToolsController } from '../controllers/toolsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All tool routes require authentication
router.post('/createPage', authMiddleware, ToolsController.createPage);
router.post('/updatePage', authMiddleware, ToolsController.updatePage);
router.post('/generateKeywords', authMiddleware, ToolsController.generateKeywords);
router.post('/generateUXLayout', authMiddleware, ToolsController.generateUXLayout);
router.post('/fetchPage', authMiddleware, ToolsController.fetchPage);
router.post('/switchTheme', authMiddleware, ToolsController.switchTheme);
router.post('/updateSitemap', authMiddleware, ToolsController.updateSitemap);
router.post('/refreshContent', authMiddleware, ToolsController.refreshContent);
router.post('/buildMicrosite', authMiddleware, ToolsController.buildMicrosite);

export default router;

