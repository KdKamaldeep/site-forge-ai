import { NextResponse, NextRequest } from "next/server";

// Cache tenant lookups for 5 minutes to reduce API calls
// This is a simple in-memory cache (for production, consider using a proper cache)
const tenantCache = new Map<string, { tenant: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isApexDomain(host: string) {
  // remove port if present
  const h = host.split(":")[0];

  // If it's already www.*, do nothing
  if (h.startsWith("www.")) return false;

  // Basic rule: "example.com" => 2 labels => apex
  // "a.example.com" => 3+ labels => subdomain
  const parts = h.split(".");
  return parts.length === 2;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  let domain = hostname.split(":")[0].toLowerCase();
  const host = request.headers.get("host") || "";
  const h = host.split(":")[0];

  if (isApexDomain(h)) {
    const url = request.nextUrl.clone();
    url.hostname = `www.${h}`;
    return NextResponse.redirect(url, 308);
  }

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
    // Try each domain variant until we find a tenant
    let tenantRes = null;
    let tenant = null;
    let foundDomain = null;
    
    for (const domainVariant of domainVariants) {
      const url = `${apiBase}/tenants/domain/${domainVariant}`;
      console.log(`[Middleware] Trying domain: ${domainVariant}`);
      
      tenantRes = await fetch(url, {
        cache: "no-store",
      });

      if (tenantRes.ok) {
        tenant = await tenantRes.json();
        foundDomain = domainVariant;
        break;
      }
    }

    if (!tenant || !tenantRes?.ok) {
      if (tenantRes?.status === 404) {
        console.warn(`⚠️ Tenant not found for: ${domainVariants.join(' or ')}`);
        console.warn(`   Make sure the backend is running and the tenant exists in the database.`);
        console.warn(`   Run: cd backend && node scripts/seed-thinkpractical.js`);
      } else {
        console.error(`❌ Backend error: ${tenantRes?.status || 'unknown'} ${tenantRes?.statusText || 'fetch failed'}`);
      }
      return NextResponse.next();
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
