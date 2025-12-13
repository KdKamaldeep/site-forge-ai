# Frontend Update Summary - Site DNA & Pillar Integration

## Overview

The Next.js frontend has been updated to consume the new backend Site DNA and pillar-based generation features. All changes are incremental and maintain backward compatibility.

## Files Created

### API Client
- **`frontend/lib/api.ts`** - Typed API client with all Site DNA endpoints
  - `getTenantByDomain()` - Gets tenant with Site DNA
  - `getNavigation()` - Gets Site DNA navigation
  - `getCategoryLanding()` - Gets category + pages
  - `listPagesByCategory()` - Paginated category pages
  - `getActivePillar()` - Gets active pillar
  - `getKeywordCluster()` - Gets cluster data
  - `triggerRunPillar()` - Triggers generation

### Tenant Context
- **`frontend/lib/tenant.ts`** - Updated with `getTenantContext()`
  - Single source of truth for tenant data
  - Returns: `{ tenant, siteDNA, activePillar }`

### Routes
- **`frontend/app/[categoryKey]/page.tsx`** - Category landing pages
- **`frontend/app/[categoryKey]/[slug]/page.tsx`** - Article pages with category routing
- **`frontend/app/admin/page.tsx`** - Admin ops page (basic auth)

### Components
- **`frontend/components/monetization/AdSlot.tsx`** - AdSense placeholder component
- **`frontend/components/monetization/AffiliateTable.tsx`** - Affiliate table component
- **`frontend/components/monetization/LeadForm.tsx`** - Lead generation form
- **`frontend/components/monetization/MonetizationRenderer.tsx`** - Replaces placeholders with components
- **`frontend/components/PillarProgressCard.tsx`** - Shows pillar progress

### API Routes
- **`frontend/app/api/pillar/run/route.ts`** - Trigger pillar generation
- **`frontend/app/api/revalidate/route.ts`** - On-demand revalidation

## Files Modified

### Layout & Navigation
- **`frontend/app/layout.js`** - Uses `getTenantContext()` for Site DNA
- **`frontend/components/layout/Header.jsx`** - Renders Site DNA navigation (max 6 in top nav)
- **`frontend/components/layout/Footer.jsx`** - Shows extra nav items (beyond 6)

### Pages
- **`frontend/app/page.js`** - Updated home page with:
  - Brand hero (name + tagline)
  - Category sections ("Start Here")
  - Latest articles
  - Pillar progress card

- **`frontend/app/[slug]/page.js`** - Updated to use new API client

### Components
- **`frontend/components/PageRenderer.jsx`** - Updated to use new MonetizationRenderer

### API Client (Legacy)
- **`frontend/lib/api.js`** - Kept for backward compatibility
- **`frontend/lib/metadata.js`** - Updated to use new API functions

## Backend Routes Added

- **`GET /api/pages/category/:tenantId/:categoryKey`** - List pages by category
- **`GET /api/clusters/:tenantId/:categoryKey/:pillarKeyword`** - Get cluster
- **`POST /api/pillar/run/:domainOrTenantId`** - Trigger generation

## Features

### 1. Site DNA Navigation
- Navigation rendered from `tenant.navigation` array
- Max 6 items in top nav, rest in footer
- Icons supported
- Category-based routing

### 2. Category Landing Pages
- Route: `/[categoryKey]`
- Shows category description from Site DNA
- Lists latest pages in category
- Breadcrumb schema
- SEO optimized

### 3. Article Pages with Category
- Route: `/[categoryKey]/[slug]`
- Verifies category matches
- Full SEO metadata
- Monetization components rendered

### 4. Monetization Components
- **AdSlot**: AdSense placeholder (shows placeholder until configured)
- **AffiliateTable**: Product comparison table
- **LeadForm**: WhatsApp + email form
- Safe HTML parsing (client-side for now)

### 5. Pillar Progress
- Shows active pillar keyword
- Progress bar (created / target)
- Planned topics count
- Link to cluster details

### 6. Admin Ops Page
- Route: `/admin`
- Shows active pillar + stats
- Button to trigger generation
- Recent pages list
- Basic token auth (env `ADMIN_ACCESS_TOKEN`)

## Caching Strategy

- **Home page**: `revalidate = 3600` (1 hour)
- **Category pages**: `revalidate = 3600` (1 hour)
- **Article pages**: `revalidate = 86400` (24 hours)
- **Admin pages**: `dynamic = 'force-dynamic'` (no cache)

## SEO Improvements

- Category pages: Breadcrumb schema
- Article pages: Article schema + FAQ schema (if present)
- Canonical URLs
- OpenGraph tags
- Proper metadata from Site DNA

## Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_ADSENSE_ID=ca-pub-xxxxx  # Optional
ADMIN_ACCESS_TOKEN=your-secret-token  # For admin page
REVALIDATE_SECRET=your-revalidate-secret  # For revalidation endpoint
```

## Usage

### View Category Pages
```
https://yourdomain.com/everyday-life
```

### View Articles
```
https://yourdomain.com/everyday-life/how-to-organize-your-home
```

### Admin Ops
```
https://yourdomain.com/admin
```

### Trigger Generation (API)
```bash
curl -X POST http://localhost:5000/api/pillar/run/yourdomain.com \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"count": 2}'
```

## Backward Compatibility

- Old routes (`/[slug]`) still work
- Legacy API functions (`fetchPage`, `fetchTenant`) still available
- Navigation falls back to old endpoint if Site DNA not available
- Pages without categoryKey work normally

## Next Steps

1. Test category pages with real data
2. Configure AdSense IDs in environment
3. Customize monetization components as needed
4. Add proper auth for admin page (if needed)
5. Implement server-side HTML parsing for better monetization rendering (optional)

