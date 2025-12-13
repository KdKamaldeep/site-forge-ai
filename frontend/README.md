# MicroSite Empire AI - Next.js Frontend

A production-grade Next.js 14 frontend with App Router, SSR, ISR, and multi-tenant support.

## 🚀 Features

- **Next.js 14 App Router**: Modern React server components
- **Server-Side Rendering (SSR)**: All pages rendered on the server
- **Incremental Static Regeneration (ISR)**: Pages revalidate every hour
- **Multi-Tenant Support**: Domain-based tenant detection via middleware
- **Dynamic SEO**: Metadata generated from backend page data
- **UX Layout Engine**: JSON-based component rendering
- **Theme System**: CSS variables injected from backend
- **TypeScript Ready**: Full TypeScript support

## 📁 Project Structure

```
frontend/
├── app/
│   ├── layout.js              # Root layout with ThemeProvider
│   ├── page.js                # Home page (SSR)
│   ├── middleware.js          # Multi-tenant domain detection
│   ├── [slug]/
│   │   ├── page.js            # Dynamic page route (SSR + ISR)
│   │   └── loading.js         # Loading state
│   └── 404.js                 # Not found page
├── components/
│   ├── theme/
│   │   ├── ThemeProvider.jsx  # Theme context provider
│   │   └── ThemeVariables.jsx # CSS variable injection
│   └── ux/
│       ├── Hero.jsx
│       ├── Paragraph.jsx
│       ├── Grid.jsx
│       ├── InfoBox.jsx
│       ├── CTA.jsx
│       ├── ImageBlock.jsx
│       ├── FeatureList.jsx
│       ├── ComparisonTable.jsx
│       └── ux-components.module.css
├── lib/
│   ├── api.js                 # Backend API fetchers
│   ├── tenant.js              # Tenant utilities
│   ├── metadata.js            # SEO metadata generator
│   └── componentFactory.js    # JSON → JSX renderer
└── styles/
    ├── globals.css            # Global styles
    └── theme.css              # Theme utilities
```

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

3. Run development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: Backend API base URL (default: `http://localhost:5000/api`)

### Multi-Tenant Setup

The middleware automatically detects the tenant from the domain:

- **Production**: Uses `request.headers.get('host')`
- **Development**: Can use `?domain=example.com` query parameter

Example:
- Production: `https://example.com/page-slug`
- Development: `http://localhost:3000/page-slug?domain=example.com`

## 📄 Pages

### Home Page (`/`)

- Renders the page with slug `"home"` for the detected tenant
- SSR with ISR (revalidates every hour)
- SEO metadata from backend

### Dynamic Pages (`/[slug]`)

- Renders any page by slug
- SSR with ISR (revalidates every hour)
- Dynamic metadata generation
- 404 handling for non-existent pages

## 🎨 UX Layout System

Pages are rendered from JSON layout provided by the backend:

```json
{
  "layout": "StandardArticle",
  "sections": [
    {
      "type": "hero",
      "title": "Welcome",
      "subtitle": "Subtitle here"
    },
    {
      "type": "paragraph",
      "text": "Content with <a href='/link'>links</a>"
    },
    {
      "type": "grid",
      "columns": 3,
      "items": [...]
    }
  ]
}
```

### Available Components

- `hero`: Hero section with title, subtitle, optional image
- `paragraph`: Text paragraph (supports HTML)
- `grid`: Responsive grid layout
- `infoBox`: Information box (info/warning/success variants)
- `cta`: Call-to-action button
- `imageBlock`: Image with optional caption
- `featureList`: List of features
- `comparisonTable`: Comparison table

## 🎯 Theme System

Themes are loaded from the backend and injected as CSS variables:

```css
:root {
  --primary: #007bff;
  --secondary: #6c757d;
  --text: #212529;
  --background: #ffffff;
  --accent: #28a745;
  --font-family: Arial, sans-serif;
  --heading-font: Arial, sans-serif;
  --font-size: 16px;
}
```

Components automatically use these variables for consistent theming.

## 🔍 SEO

Metadata is generated server-side from page data:

- **Title**: From `page.meta.title` or `page.title`
- **Description**: From `page.meta.description` or content excerpt
- **Keywords**: From `page.meta.keywords`
- **Open Graph**: Full OG tags
- **Twitter Cards**: Twitter-specific metadata
- **Canonical URL**: Automatic canonical URL generation

## 🚀 Production Deployment

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_BASE_URL`
3. Deploy

### Deploy to Other Platforms

The app is a standard Next.js application and can be deployed to:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker
- Any Node.js hosting

## 🔄 ISR (Incremental Static Regeneration)

Pages use ISR with 1-hour revalidation:

```javascript
export const revalidate = 3600; // 1 hour
```

This means:
- Pages are statically generated at build time
- Revalidated every hour in the background
- Always fast, always fresh

## 🐛 Troubleshooting

### Tenant Not Found

- Check backend is running
- Verify domain in URL or query param
- Check middleware logs
- Ensure tenant exists in backend database

### Pages Not Loading

- Verify backend API is accessible
- Check `NEXT_PUBLIC_API_BASE_URL` is correct
- Review browser console and server logs

### Theme Not Applying

- Verify tenant has theme settings in backend
- Check ThemeProvider is wrapping content
- Inspect CSS variables in browser dev tools

## 📝 Development

### Running Locally

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### Testing Multi-Tenant

1. Create tenants in backend with different domains
2. Access via: `http://localhost:3000?domain=example.com`
3. Or use hosts file to map domains to localhost

## 📄 License

ISC

---

**Built with Next.js 14, React, and ❤️**

