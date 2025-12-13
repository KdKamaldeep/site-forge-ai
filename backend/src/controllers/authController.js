import AdminUser from '../models/AdminUser.js';
import { generateToken } from '../middlewares/authMiddleware.js';

export class AuthController {
  /**
   * Register new admin user
   */
  static async register(req, res, next) {
    try {
      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await AdminUser.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const admin = new AdminUser({ email, password, name });
      await admin.save();

      const token = generateToken(admin._id);

      res.status(201).json({
        token,
        user: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login admin user
   * Supports both API (JSON) and web form (redirect) requests
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const admin = await AdminUser.findOne({ email });
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(admin._id);

      // Set HTTP-only cookie for server-side page access
      res.cookie('adminToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Check if this is an API request (via Accept header or path)
      const isApiRequest = 
        req.path.startsWith('/api/') || 
        req.get('Accept')?.includes('application/json') ||
        req.get('Content-Type')?.includes('application/json');

      if (isApiRequest) {
        // Return JSON response for API requests
        return res.json({
          success: true,
          token,
          user: {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role
          }
        });
      } else {
        // Redirect to dashboard for web form requests
        return res.redirect('/admin/dashboard');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  static async me(req, res, next) {
    try {
      res.json({
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

