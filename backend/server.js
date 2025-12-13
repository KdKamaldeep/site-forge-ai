// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import tenantRoutes from './src/routes/tenantRoutes.js';
import pageRoutes from './src/routes/pageRoutes.js';
import themeRoutes from './src/routes/themeRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import toolsRoutes from './src/routes/toolsRoutes.js';
import navigationRoutes from './src/routes/navigationRoutes.js';
import revalidateRoutes from './src/routes/revalidateRoutes.js';
import sitemapRoutes from './src/routes/sitemapRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import searchConsoleRoutes from './src/routes/searchConsoleRoutes.js';
import optimizationRoutes from './src/routes/optimizationRoutes.js';
import reportsRoutes from './src/routes/reportsRoutes.js';
import clusterRoutes from './src/routes/clusterRoutes.js';
import pillarRoutes from './src/routes/pillarRoutes.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import { swaggerSpec, swaggerUi } from './src/config/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Serve static files for admin panel
app.use('/admin/styles.css', express.static(path.join(__dirname, 'src/views/admin/styles.css')));
app.use('/admin/js', express.static(path.join(__dirname, 'src/views/admin')));

// Serve images directory
const imagesDir = path.join(__dirname, 'images');
app.use('/images', express.static(imagesDir));
console.log(`📁 Images directory: ${imagesDir}`);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MicroSite Empire AI API Documentation'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/tenants', searchConsoleRoutes); // GSC routes under /api/tenants/:tenantId/gsc/*
app.use('/api/tenants', reportsRoutes); // Reports routes under /api/tenants/:tenantId/reports/*
app.use('/api/pages', pageRoutes);
app.use('/api/pages', optimizationRoutes); // Optimization routes under /api/pages/:pageId/rollback/:version
app.use('/api/themes', themeRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/revalidate', revalidateRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/pillar', pillarRoutes);

// Sitemap and robots.txt routes (domain-based, before admin routes)
app.use('/', sitemapRoutes);

// Admin CMS routes (must be before error handler)
app.use('/admin', adminRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🔐 Admin CMS available at http://localhost:${PORT}/admin`);
      console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

export default app;

