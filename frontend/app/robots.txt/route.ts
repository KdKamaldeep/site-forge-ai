/**
 * Robots.txt Route Handler
 * Generates and serves robots.txt for the tenant
 * Accessible at /robots.txt
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTenantContext } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

/**
 * Generate robots.txt content
 */
function generateRobotsTxt(baseUrl: string): string {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${sitemapUrl}`;
}

/**
 * GET /robots.txt
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context
    const context = await getTenantContext();
    const tenant = context.tenant;

    if (!tenant) {
      // Return default robots.txt if tenant not found
      return new NextResponse(
        `User-agent: *
Disallow: /`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    // Construct base URL from tenant domain
    const baseUrl = `https://${tenant.domain}`;
    
    // Generate robots.txt content
    const robotsTxt = generateRobotsTxt(baseUrl);

    // Return text/plain response
    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error generating robots.txt:', error);
    // Return default robots.txt on error
    return new NextResponse(
      `User-agent: *
Disallow: /`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    );
  }
}
