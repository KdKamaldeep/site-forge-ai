import axios from 'axios';

export class RevalidateController {
  /**
   * Revalidate Next.js ISR cache
   * Calls Vercel revalidate endpoint
   */
  static async revalidate(req, res, next) {
    try {
      const { tenantId, slug } = req.body;
      
      if (!tenantId || !slug) {
        return res.status(400).json({ 
          error: 'tenantId and slug are required' 
        });
      }

      // Get frontend domain from environment
      const frontendDomain = process.env.NEXT_PUBLIC_FRONTEND_DOMAIN || 
                            process.env.FRONTEND_DOMAIN || 
                            'http://localhost:3000';
      
      // Build revalidate path
      const path = slug === 'home' || slug === '' ? '/' : `/${slug}`;
      const revalidateUrl = `${frontendDomain}/api/revalidate?path=${path}&secret=${process.env.REVALIDATE_SECRET || 'your-secret-key'}`;

      try {
        // Call Next.js revalidate endpoint
        const response = await axios.post(revalidateUrl, {}, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        res.json({
          success: true,
          message: 'Page revalidated successfully',
          path,
          revalidated: true
        });
      } catch (axiosError) {
        // If revalidate fails, still return success (frontend might not be deployed)
        console.warn('Revalidate endpoint call failed:', axiosError.message);
        
        res.json({
          success: true,
          message: 'Revalidate request processed (frontend may not be available)',
          path,
          revalidated: false,
          warning: axiosError.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

