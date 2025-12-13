/**
 * Tool Handlers for OpenAI Agent
 * Handles all tool function calls from the agent
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

// Store authentication token
let authToken = null;
let tokenExpiry = null;

/**
 * Login to backend API and get authentication token
 */
async function login() {
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    // Token is still valid
    return authToken;
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
  }

  console.log('🔐 [Auth] Logging in to backend API...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.token) {
      throw new Error('Login response missing token');
    }

    authToken = data.token;
    // Token expires in 7 days, set expiry to 6.5 days to be safe
    tokenExpiry = Date.now() + (6.5 * 24 * 60 * 60 * 1000);
    
    console.log('✅ [Auth] Successfully authenticated');
    return authToken;
  } catch (error) {
    console.error('❌ [Auth] Login failed:', error.message);
    throw error;
  }
}

/**
 * Make authenticated request to backend
 */
async function backendRequest(endpoint, options = {}) {
  // Ensure we're authenticated
  const token = await login();
  
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  try {
    console.log(`🔧 [Tool Handler] ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, {
      ...options,
      headers
    });

    // If unauthorized, try to re-login once
    if (response.status === 401) {
      console.log('⚠️  [Auth] Token expired or invalid, re-authenticating...');
      authToken = null; // Clear token
      const newToken = await login();
      headers['Authorization'] = `Bearer ${newToken}`;
      
      // Retry request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        console.error(`❌ [Tool Handler] Error ${retryResponse.status}: ${errorText}`);
        throw new Error(`Backend error: ${retryResponse.status} - ${errorText}`);
      }

      const data = await retryResponse.json();
      console.log(`✅ [Tool Handler] Success: ${JSON.stringify(data).substring(0, 200)}...`);
      return data;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Tool Handler] Error ${response.status}: ${errorText}`);
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [Tool Handler] Success: ${JSON.stringify(data).substring(0, 200)}...`);
    return data;
  } catch (error) {
    console.error(`❌ [Tool Handler] Request failed:`, error.message);
    throw error;
  }
}

/**
 * Check if error is a 404 (not found) error
 */
function isNotFoundError(error) {
  if (!error || !error.message) return false;
  const message = error.message.toLowerCase();
  return message.includes('404') || 
         message.includes('not found') || 
         message.includes('tenant not found');
}

/**
 * Generate a tenant name from domain
 */
function generateTenantName(domain) {
  // Remove protocol if present
  let cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase();
  
  // Extract first part (subdomain or main domain name)
  const parts = cleanDomain.split('.');
  let name = parts[0];
  
  // Capitalize first letter
  if (name) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  } else {
    // Fallback if no subdomain
    name = cleanDomain.split('.')[0] || 'New Tenant';
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  return name;
}

/**
 * Create a new tenant
 */
async function createTenant(domain) {
  console.log(`✨ [Tenant] Creating new tenant for domain: ${domain}`);
  
  const tenantName = generateTenantName(domain);
  const normalizedDomain = domain.toLowerCase().trim();
  
  const tenantData = {
    name: tenantName,
    domain: normalizedDomain,
    theme: {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        text: '#212529',
        background: '#ffffff',
        accent: '#28a745'
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        headingFont: 'Arial, sans-serif',
        fontSize: '16px'
      }
    }
  };

  try {
    const tenant = await backendRequest('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData)
    });
    
    console.log(`✅ [Tenant] Created new tenant: ${tenant.name} (${tenant.domain})`);
    return tenant;
  } catch (error) {
    console.error(`❌ [Tenant] Failed to create tenant:`, error.message);
    throw error;
  }
}

/**
 * Handle getTenantInfo tool call
 * Automatically creates tenant if not found
 */
export async function handleGetTenantInfo(args) {
  console.log(`\n📋 [getTenantInfo] Fetching tenant info for domain: ${args.domain}`);
  
  try {
    let tenant;
    let tenantNotFound = false;
    
    try {
      // Try to get existing tenant
      tenant = await backendRequest(`/tenants/domain/${encodeURIComponent(args.domain)}`, {
        method: 'GET'
      });
      
      if (!tenant || !tenant._id) {
        tenantNotFound = true;
      } else {
        console.log(`✅ [Tenant] Found existing tenant: ${tenant.name}`);
      }
    } catch (error) {
      // Check if error is 404 (tenant not found)
      if (isNotFoundError(error)) {
        tenantNotFound = true;
      } else {
        // Re-throw other errors
        throw error;
      }
    }
    
    // If tenant not found, create it
    if (tenantNotFound) {
      console.log(`⚠️  [Tenant] Tenant not found, creating new tenant...`);
      tenant = await createTenant(args.domain);
    }

    return {
      success: true,
      tenant: {
        id: tenant._id || tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        theme: tenant.theme,
        logo: tenant.logo || null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle createPage tool call
 */
export async function handleCreatePage(args) {
  console.log(`\n✨ [createPage] Creating new page: "${args.title}" (slug: ${args.slug})`);
  console.log(`   Tenant ID: ${args.tenantId}`);
  console.log(`   Content length: ${args.html?.length || 0} characters`);

  try {
    // Validate required fields
    if (!args.tenantId || !args.title || !args.slug || !args.html) {
      return {
        success: false,
        error: 'Missing required fields: tenantId, title, slug, and html are required'
      };
    }

    // Prepare page data
    const pageData = {
      tenantId: args.tenantId,
      title: args.title,
      slug: args.slug,
      content: args.html, // Backend expects 'content' not 'html'
      meta: args.meta || {
        title: args.title,
        description: '',
        keywords: []
      },
      uxLayout: args.uxLayout || {
        sections: []
      }
    };

    const result = await backendRequest('/tools/createPage', {
      method: 'POST',
      body: JSON.stringify(pageData)
    });

    return {
      success: true,
      page: {
        id: result.page?._id || result.page?.id,
        title: result.page?.title,
        slug: result.page?.slug
      },
      message: `Page "${args.title}" created successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle updatePage tool call
 */
export async function handleUpdatePage(args) {
  console.log(`\n🔄 [updatePage] Updating page: ${args.pageId}`);
  console.log(`   Tenant ID: ${args.tenantId}`);
  
  if (args.title) console.log(`   New title: ${args.title}`);
  if (args.html) console.log(`   Content length: ${args.html.length} characters`);

  try {
    // Validate required fields
    if (!args.tenantId || !args.pageId) {
      return {
        success: false,
        error: 'Missing required fields: tenantId and pageId are required'
      };
    }

    // Prepare update data (only include provided fields)
    const updateData = {
      pageId: args.pageId
    };
    
    if (args.title) updateData.title = args.title;
    if (args.html) updateData.content = args.html; // Backend expects 'content'
    if (args.meta) updateData.meta = args.meta;
    if (args.uxLayout) updateData.uxLayout = args.uxLayout;

    const result = await backendRequest('/tools/updatePage', {
      method: 'POST',
      body: JSON.stringify(updateData)
    });

    return {
      success: true,
      page: {
        id: result.page?._id || result.page?.id || args.pageId,
        title: result.page?.title || args.title,
        slug: result.page?.slug
      },
      message: `Page updated successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize authentication (called before agent starts)
 */
export async function initializeAuth() {
  try {
    console.log('🔐 Initializing authentication...');
    await login();
    console.log('✅ Authentication initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize authentication:', error.message);
    throw error;
  }
}

/**
 * Export tool handlers map
 */
export const toolHandlers = {
  getTenantInfo: handleGetTenantInfo,
  createPage: handleCreatePage,
  updatePage: handleUpdatePage
};

