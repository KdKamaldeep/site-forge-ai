import express from 'express';
import { AdminController } from '../controllers/adminController.js';
import { AuthController } from '../controllers/authController.js';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

// Public admin routes (login page)
router.get('/login', AdminController.serveLogin);
router.post('/login', AuthController.login);

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.redirect('/admin/login');
});

// Protected admin routes (require authentication)
router.use(adminAuthMiddleware);

// Dashboard
router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});
router.get('/dashboard', AdminController.serveDashboard);

// Tenant management
router.get('/tenants', AdminController.serveTenants);
router.get('/tenants/new', AdminController.serveEditTenant);
router.get('/tenants/edit/:id', AdminController.serveEditTenant);
router.post('/tenants', AdminController.handleTenantSave);
router.post('/tenants/update/:id', AdminController.handleTenantSave);
router.post('/tenants/delete/:id', AdminController.handleTenantDelete);

// Page management
router.get('/pages', AdminController.servePages);
router.get('/pages/new', AdminController.serveEditPage);

// AI Audit
router.get('/audit', AdminController.serveAudit);
router.get('/pages/edit/:id', AdminController.serveEditPage);
router.post('/pages', AdminController.handlePageSave);
router.post('/pages/update/:id', AdminController.handlePageSave);
router.post('/pages/delete/:id', AdminController.handlePageDelete);

// Theme management
router.get('/themes', AdminController.serveThemes);
router.get('/themes/new', AdminController.serveEditTheme);
router.get('/themes/edit/:id', AdminController.serveEditTheme);
router.post('/themes', AdminController.handleThemeSave);
router.post('/themes/update/:id', AdminController.handleThemeSave);
router.post('/themes/delete/:id', AdminController.handleThemeDelete);

// Navigation management
router.get('/navigation', AdminController.serveNavigation);
router.get('/navigation/edit/:tenantId', AdminController.serveEditNavigation);
router.post('/navigation/update/:tenantId', AdminController.handleNavigationSave);
router.post('/navigation/delete/:tenantId', AdminController.handleNavigationDelete);

export default router;
