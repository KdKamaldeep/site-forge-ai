import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';

/**
 * Admin Authentication Middleware
 * Redirects to login if not authenticated (for HTML pages)
 */
export async function adminAuthMiddleware(req, res, next) {
  try {
    // Get token from cookie (preferred for HTML pages) or Authorization header
    const token = req.cookies?.adminToken ||
                  req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers['x-auth-token'];

    // Check if this is an HTML page request (not API endpoint)
    const isHtmlRequest = !req.path.startsWith('/api') && 
                         !req.path.includes('.json') &&
                         (req.accepts('html') || 
                          !req.accepts('json') || 
                          req.get('accept')?.includes('text/html') ||
                          !req.get('accept'));

    // For HTML pages without token, redirect to login
    if (!token) {
      if (isHtmlRequest) {
        return res.redirect('/admin/login');
      }
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    const admin = await AdminUser.findById(decoded.userId).select('-password');
    
    if (!admin) {
      const isHtmlRequest = !req.path.startsWith('/api') && 
                           !req.path.includes('.json') &&
                           (req.accepts('html') || 
                            !req.accepts('json') || 
                            req.get('accept')?.includes('text/html') ||
                            !req.get('accept'));
      if (isHtmlRequest) {
        return res.redirect('/admin/login');
      }
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.user = admin;
    req.userId = admin._id.toString();
    
    next();
  } catch (error) {
    const isHtmlRequest = !req.path.startsWith('/api') && 
                         !req.path.includes('.json') &&
                         (req.accepts('html') || 
                          !req.accepts('json') || 
                          req.get('accept')?.includes('text/html') ||
                          !req.get('accept'));
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      if (isHtmlRequest) {
        return res.redirect('/admin/login');
      }
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Admin auth middleware error:', error);
    if (isHtmlRequest) {
      return res.redirect('/admin/login');
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
}
