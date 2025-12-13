# Frontend-Backend Sync Documentation

## Overview

The Next.js 14 frontend is now fully synced with the backend APIs. All data fetching is done server-side (SSR) for optimal SEO and performance.

---

## ✅ Completed Sync Tasks

### 1️⃣ Tenant Sync (Domain-based detection)

**File:** `app/middleware.js`

- ✅ Reads hostname from `request.headers.get("host")`
- ✅ Calls backend `GET /api/tenants/domain/:domain`
- ✅ Extracts `tenantId` and `tenantDomain` from response
- ✅ Injects into request headers:
  - `x-tenant-id`
  - `x-tenant-domain`
  - `x-tenant-name`
- ✅ All routes can access these headers using `headers()` API

**Usage:**
```javascript
const headersList = await headers();
const tenantId = headersList.get('x-tenant-id');
const tenantDomain = headersList.get('x-tenant-domain');
```

---

### 2️⃣ Layout Sync (Tenant + Navigation)

**File:** `app/layout.js`

- ✅ Reads tenant from headers
- ✅ Fetches tenant metadata: `GET /api/tenants/domain/:domain`
- ✅ Fetches navigation menu: `GET /api/navigation/:tenantId`
- ✅ Passes theme and navigation to Header, Footer, ThemeProvider
- ✅ No redesign - only connected to backend

**Components:**
- `Header` - Displays logo, menu, CTA from backend
- `Footer` - Displays tenant name
- `ThemeProvider` - Injects theme CSS variables

---

### 3️⃣ Page SSR Sync (Dynamic Content)

**File:** `app/[slug]/page.js`

- ✅ Reads slug from params
- ✅ Reads `x-tenant-id` from headers
- ✅ Calls: `GET /api/pages/:tenantId/:slug`
- ✅ Passes `page.content`, `page.uxLayout`, `page.meta` to `PageRenderer`
- ✅ ISR enabled: `export const revalidate = 3600`

**Rendering:**
```javascript
<PageRenderer 
  layout={page.uxLayout} 
  content={page.content} 
  meta={page.meta}
  title={page.title}
/>
```

---

### 4️⃣ Homepage SSR Sync

**File:** `app/page.js`

- ✅ Reads tenant via headers
- ✅ Calls: `GET /api/pages/home/:tenantId`
- ✅ Renders using same `PageRenderer` component
- ✅ ISR enabled: `export const revalidate = 3600`
- ✅ Metadata generation included

---

### 5️⃣ Metadata Sync

**File:** `lib/metadata.js`

- ✅ Reads tenant domain from headers
- ✅ Fetches page meta from backend on SSR
- ✅ Returns complete SEO metadata:
  - `title`
  - `description`
  - `keywords`
  - `openGraph` (with ogImage support)
  - `twitter` card
  - `canonical` URL

**Features:**
- Supports `ogImage` from backend meta
- Uses tenant domain for canonical URLs
- Handles both homepage and dynamic pages

---

### 6️⃣ API Fetching Utils

**File:** `lib/api.js`

All functions use `process.env.NEXT_PUBLIC_API_BASE_URL`:

- ✅ `fetchTenant(domain)` - `GET /api/tenants/domain/:domain`
- ✅ `fetchPage(tenantId, slug)` - `GET /api/pages/:tenantId/:slug`
- ✅ `fetchHomePage(tenantId)` - `GET /api/pages/home/:tenantId`
- ✅ `fetchNavigation(tenantId)` - `GET /api/navigation/:tenantId`
- ✅ `fetchPagesList(tenantId)` - `GET /api/pages/list/:tenantId`

**Implementation:**
- Uses native `fetch` (no axios) for SSR compatibility
- `cache: 'no-store'` for fresh data
- Proper error handling with null returns

---

### 7️⃣ UX Layout Renderer Sync

**File:** `lib/componentFactory.js`

- ✅ Existing UX components remain unchanged
- ✅ `PageRenderer` imports UX components
- ✅ `componentFactory` resolves types from backend JSON:
  - `"hero"` → `Hero` component
  - `"paragraph"` → `Paragraph` component
  - `"grid"` → `Grid` component
  - `"cta"` → `CTA` component
  - `"imageBlock"` → `ImageBlock` component
  - `"infoBox"` → `InfoBox` component
  - `"featureList"` → `FeatureList` component
  - `"comparisonTable"` → `ComparisonTable` component

**Rendering:**
```javascript
// Backend returns: { layout: { sections: [{ type: "hero", props: {...} }] } }
// ComponentFactory maps to: <Hero {...props} />
```

---

### 8️⃣ Theme Sync

**Files:** 
- `components/theme/ThemeProvider.jsx`
- `components/theme/ThemeVariables.jsx`

- ✅ Theme values from backend:
  ```json
  {
    "theme": {
      "colors": { "primary", "background", "text" },
      "typography": { "headingFont", "fontFamily" }
    }
  }
  ```

- ✅ Maps to CSS variables:
  - `--primary`
  - `--background`
  - `--text`
  - `--heading-font`
  - `--body-font`

**Injection:**
- CSS variables injected into `:root` via `ThemeVariables`
- Available throughout the app

---

### 9️⃣ Page List Sync (Sitemap/SEO)

**File:** `lib/api.js`

- ✅ `fetchPagesList(tenantId)` function available
- ✅ Calls: `GET /api/pages/list/:tenantId`
- ✅ Returns: `{ pages: [{ slug, title }] }`
- ✅ Ready for future sitemap.xml generation

---

## 📁 File Structure

```
frontend/
├── app/
│   ├── middleware.js          ✅ Tenant domain detection
│   ├── layout.js              ✅ Tenant + Navigation fetch
│   ├── page.js                 ✅ Homepage SSR
│   └── [slug]/
│       └── page.js             ✅ Dynamic page SSR
├── lib/
│   ├── api.js                  ✅ All API fetch functions
│   ├── metadata.js             ✅ SEO metadata generation
│   ├── componentFactory.js     ✅ UX Layout → React components
│   └── tenant.js               ✅ Tenant utilities
├── components/
│   ├── PageRenderer.jsx       ✅ Page content renderer
│   ├── layout/
│   │   ├── Header.jsx          ✅ Navigation menu
│   │   └── Footer.jsx           ✅ Footer
│   └── theme/
│       ├── ThemeProvider.jsx   ✅ Theme context
│       └── ThemeVariables.jsx  ✅ CSS variable injection
└── components/ux/              ✅ Existing UX components (unchanged)
```

---

## 🔄 Data Flow

```
1. Request → Middleware
   ↓
2. Middleware fetches tenant by domain
   ↓
3. Middleware injects x-tenant-id, x-tenant-domain headers
   ↓
4. Layout fetches tenant + navigation
   ↓
5. Layout renders Header + Footer with navigation
   ↓
6. Page fetches page data (homepage or slug)
   ↓
7. PageRenderer renders UX Layout or HTML content
   ↓
8. ThemeProvider injects CSS variables
   ↓
9. Response sent to client (SSR)
```

---

## 🎯 Key Features

- ✅ **100% SSR** - All data fetching server-side
- ✅ **ISR Enabled** - Pages revalidate every hour
- ✅ **SEO Optimized** - Dynamic metadata per page
- ✅ **Multi-tenant** - Domain-based tenant resolution
- ✅ **Theme System** - Dynamic CSS variables from backend
- ✅ **Navigation** - Auto-generated or custom menus
- ✅ **UX Layout Engine** - JSON to React component mapping
- ✅ **Error Handling** - Graceful fallbacks

---

## 🚀 Usage

### Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### Testing

1. Start backend: `npm run dev` (port 5000)
2. Start frontend: `npm run dev` (port 3000)
3. Access via domain: `http://localhost:3000?domain=your-tenant-domain`
4. Or configure hosts file for domain-based testing

---

## 📝 Notes

- All API calls are SSR-friendly (no client-side fetch)
- Components are Server Components by default
- Client Components marked with `'use client'` where needed
- No UI redesign - only data connection
- Existing UX components work as-is
- Theme system fully integrated
- Navigation auto-generates from pages if not configured

---

## ✅ Sync Status

All tasks completed:
- ✅ Tenant sync
- ✅ Layout sync
- ✅ Page SSR sync
- ✅ Homepage SSR sync
- ✅ Metadata sync
- ✅ API fetching utils
- ✅ UX Layout renderer
- ✅ Theme sync
- ✅ Page list sync

**Frontend is now fully synced with backend APIs!** 🎉

