import { NextResponse, NextRequest } from "next/server";

// Cache tenant lookups for 5 minutes to reduce API calls
// This is a simple in-memory cache (for production, consider using a proper cache)
const tenantCache = new Map<string, { tenant: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  let domain = hostname.split(":")[0].toLowerCase();
  
  // If domain doesn't have a TLD (e.g., "thinkpractical" instead of "thinkpractical.com"),
  // try both formats
  const domainVariants = [domain];
  if (!domain.includes('.')) {
    domainVariants.push(`${domain}.com`);
  }

  // Backend URL
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    console.error("❌ NEXT_PUBLIC_API_BASE_URL is missing");
    return NextResponse.next();
  }

  try {
    // Check cache first
    let tenant = null;
    let foundDomain = null;
    
    for (const domainVariant of domainVariants) {
      const cached = tenantCache.get(domainVariant);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        tenant = cached.tenant;
        foundDomain = domainVariant;
        console.log(`✅ [Middleware] Using cached tenant for: ${domainVariant}`);
        break;
      }
    }
    
    // If not in cache, fetch from API
    if (!tenant) {
      let tenantRes = null;
      
      for (const domainVariant of domainVariants) {
        const url = `${apiBase}/tenants/domain/${domainVariant}`;
        console.log(`[Middleware] Fetching tenant for: ${domainVariant}`);
        
        // Use Next.js fetch caching with short revalidation (5 minutes)
        tenantRes = await fetch(url, {
          next: { revalidate: 300 }, // 5 minutes
        });

        if (tenantRes.ok) {
          tenant = await tenantRes.json();
          foundDomain = domainVariant;
          // Cache the result
          tenantCache.set(domainVariant, { tenant, timestamp: Date.now() });
          break;
        } else if (tenantRes.status === 404) {
          // Continue to next variant
          continue;
        } else {
          // Error response
          console.error(`❌ Backend error: ${tenantRes.status} ${tenantRes.statusText}`);
        }
      }
      
      // If no tenant found after trying all variants
      if (!tenant) {
        console.warn(`⚠️ Tenant not found for: ${domainVariants.join(' or ')}`);
        console.warn(`   Make sure the backend is running and the tenant exists in the database.`);
        console.warn(`   Run: cd backend && node scripts/seed-thinkpractical.js`);
        return NextResponse.next();
      }
    }

    if (!tenant || !tenant._id) {
      console.warn(`⚠️ Invalid tenant response for: ${foundDomain}`);
      return NextResponse.next();
    }

    // Add tenant headers
    const headers = new Headers(request.headers);
    headers.set("x-tenant-id", tenant._id?.toString() || tenant._id);
    headers.set("x-tenant-domain", tenant.domain);
    headers.set("x-tenant-name", tenant.name || "");

    console.log(`✅ [Middleware] Tenant found: ${tenant.name} (${tenant.domain}) using domain: ${foundDomain}`);

    return NextResponse.next({
      request: { headers },
    });
  } catch (err) {
    console.error("❌ Middleware fetch error:", err);
    console.error(`   Check if backend is running at: ${apiBase}`);
    console.error(`   Error details:`, err instanceof Error ? err.message : String(err));
    return NextResponse.next();
  }
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
