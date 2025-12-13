import { TenantService } from '../services/TenantService.js';

/**
 * Middleware to resolve tenant from request
 * Looks for domain in headers or query params
 */
export async function tenantResolver(req, res, next) {
  try {
    // Get domain from various sources
    const domain = 
      req.headers['x-tenant-domain'] ||
      req.headers.host?.split(':')[0] ||
      req.query.domain ||
      req.body.domain;

    if (!domain) {
      return res.status(400).json({ 
        error: 'Tenant domain not provided. Use x-tenant-domain header or domain query param.' 
      });
    }

    const tenant = await TenantService.getTenantByDomain(domain);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant._id.toString();
    
    next();
  } catch (error) {
    console.error('Tenant resolver error:', error);
    res.status(500).json({ error: 'Failed to resolve tenant' });
  }
}

