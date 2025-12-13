import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';

/**
 * JWT Authentication Middleware
 */
export async function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header, x-auth-token header, or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers['x-auth-token'] ||
                  req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    const admin = await AdminUser.findById(decoded.userId).select('-password');
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.user = admin;
    req.userId = admin._id.toString();
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Generate JWT token
 */
export function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
}

