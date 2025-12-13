import express from 'express';
import { ThemeController } from '../controllers/themeController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All theme routes require authentication
router.post('/', authMiddleware, ThemeController.create);
router.get('/', ThemeController.list); // Public list
router.get('/:id', ThemeController.getById); // Public get
router.put('/:id', authMiddleware, ThemeController.update);
router.delete('/:id', authMiddleware, ThemeController.delete);

export default router;

