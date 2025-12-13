# MicroSite Empire AI

A full production-grade SaaS platform for creating and managing multi-tenant micro-sites with AI-powered content generation, dynamic UX layouts, and comprehensive SEO tools.

## 🚀 Features

- **Multi-Tenant Architecture**: Each domain is a separate tenant with its own theme and settings
- **Dynamic UX Layout Engine**: JSON-based layout system that renders React components dynamically
- **AI-Powered Content Generation**: OpenAI integration for content, keywords, and UX layouts
- **Internal Linking Engine**: Automatic internal linking between pages for SEO
- **Sitemap Generator**: Automatic XML sitemap generation
- **Theme System**: React component-based themes with CSS variables
- **JWT Authentication**: Secure admin authentication
- **SEO Tools**: Keyword generation, meta optimization, content validation
- **Agent System**: Three specialized AI agents for building, designing, and updating content

## 📁 Project Structure

```
.
├── backend/                 # Node.js + Express + MongoDB backend
│   ├── src/
│   │   ├── models/         # Mongoose models (Tenant, Page, Theme, AdminUser)
│   │   ├── controllers/    # Route controllers
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic services
│   │   ├── middlewares/    # Express middlewares
│   │   ├── utils/          # Utility functions
│   │   ├── agents/         # AI agent definitions
│   │   └── tools/          # Agent tool handlers
│   └── server.js           # Express server entry point
│
└── frontend/               # React + TypeScript frontend
    ├── src/
    │   ├── components/    # React components
    │   │   ├── ux/         # UX layout components
    │   │   └── layout/     # Layout components
    │   ├── pages/          # Page components
    │   ├── services/       # API service layer
    │   ├── hooks/          # React hooks
    │   └── theme/          # Theme definitions
    └── vite.config.ts      # Vite configuration
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+ and npm
- MongoDB 6+
- OpenAI API key (for AI features)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/microsite-empire
JWT_SECRET=your-super-secret-jwt-key-change-in-production
OPENAI_API_KEY=your-openai-api-key-here
```

4. Start MongoDB (if running locally):
```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# Start MongoDB service from Services panel
```

5. Start the backend server:
```bash
npm run dev
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional):
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📚 API Documentation

### Authentication

#### Register Admin User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword",
  "name": "Admin User"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

Response includes a JWT token that should be used in subsequent requests:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

Use the token in requests:
```http
Authorization: Bearer <token>
```

### Tenants

#### Create Tenant
```http
POST /api/tenants
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Example Site",
  "domain": "example.com",
  "settings": {
    "colors": {
      "primary": "#007bff",
      "secondary": "#6c757d",
      "text": "#212529",
      "background": "#ffffff",
      "accent": "#28a745"
    },
    "typography": {
      "fontFamily": "Arial, sans-serif",
      "headingFont": "Arial, sans-serif",
      "fontSize": "16px"
    },
    "layoutType": "standard"
  }
}
```

#### Get Tenant by Domain (Public)
```http
GET /api/tenants/domain/example.com
```

#### Update Tenant Theme
```http
PUT /api/tenants/:id/theme
Authorization: Bearer <token>
Content-Type: application/json

{
  "themeId": "theme-id-here"
}
```

### Pages

#### Create Page
```http
POST /api/pages
Authorization: Bearer <token>
Content-Type: application/json

{
  "tenantId": "tenant-id",
  "title": "Page Title",
  "slug": "page-slug",
  "content": "Long form content here...",
  "meta": {
    "title": "SEO Title",
    "description": "SEO Description",
    "keywords": ["keyword1", "keyword2"]
  },
  "uxLayout": {
    "layout": "StandardArticle",
    "sections": [
      {
        "type": "hero",
        "title": "Hero Title",
        "subtitle": "Hero Subtitle"
      },
      {
        "type": "paragraph",
        "text": "Paragraph content..."
      }
    ]
  }
}
```

#### Get Page by Slug (Public)
```http
GET /api/pages/:tenantId/:slug
```

#### List Pages
```http
GET /api/pages/list/:tenantId
Authorization: Bearer <token>
```

### Themes

#### Create Theme
```http
POST /api/themes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Modern Theme",
  "components": {},
  "styles": {}
}
```

#### List Themes (Public)
```http
GET /api/themes
```

### Agent Tools

All tool endpoints require authentication.

#### Create Page Tool
```http
POST /api/tools/createPage
Authorization: Bearer <token>
Content-Type: application/json

{
  "tenantId": "tenant-id",
  "title": "Page Title",
  "slug": "page-slug",
  "content": "Content...",
  "meta": {},
  "uxLayout": {}
}
```

#### Generate Keywords
```http
POST /api/tools/generateKeywords
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Web Development",
  "count": 10,
  "tenantId": "tenant-id"
}
```

#### Generate UX Layout
```http
POST /api/tools/generateUXLayout
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Long form content...",
  "style": "standard"
}
```

#### Update Sitemap
```http
POST /api/tools/updateSitemap
Authorization: Bearer <token>
Content-Type: application/json

{
  "tenantId": "tenant-id"
}
```

#### Refresh Content
```http
POST /api/tools/refreshContent
Authorization: Bearer <token>
Content-Type: application/json

{
  "pageId": "page-id"
}
```

## 🎨 UX Layout System

The UX layout system uses JSON to define page structure. Each page has a `uxLayout` object:

```json
{
  "layout": "StandardArticle",
  "sections": [
    {
      "type": "hero",
      "title": "Welcome",
      "subtitle": "Subtitle here",
      "image": "https://example.com/image.jpg"
    },
    {
      "type": "paragraph",
      "text": "Paragraph content with <a href='/link'>internal links</a>"
    },
    {
      "type": "grid",
      "columns": 3,
      "items": [
        {
          "title": "Feature 1",
          "text": "Description",
          "image": "https://example.com/img1.jpg"
        }
      ]
    },
    {
      "type": "infoBox",
      "title": "Important Info",
      "text": "Info text here",
      "variant": "info"
    },
    {
      "type": "cta",
      "text": "Get Started",
      "link": "/signup",
      "variant": "primary"
    },
    {
      "type": "imageBlock",
      "image": "https://example.com/image.jpg",
      "caption": "Image caption"
    },
    {
      "type": "featureList",
      "items": [
        {
          "title": "Feature",
          "description": "Description"
        }
      ]
    },
    {
      "type": "comparisonTable",
      "headers": ["Feature", "Basic", "Pro"],
      "rows": [
        ["Price", "$10", "$50"],
        ["Support", "Email", "24/7"]
      ]
    }
  ]
}
```

### Available Section Types

- **hero**: Hero section with title, subtitle, and optional image
- **paragraph**: Text paragraph (supports HTML)
- **grid**: Responsive grid layout
- **infoBox**: Information box with variants (info, warning, success)
- **cta**: Call-to-action button
- **imageBlock**: Image with optional caption
- **featureList**: List of features
- **comparisonTable**: Comparison table

### Layout Types

- `StandardArticle`: Standard article layout
- `MinimalArticle`: Minimal layout
- `ModernArticle`: Modern layout
- `ClassicArticle`: Classic layout

## 🤖 AI Agents

### 1. MicroSite Builder Agent

Orchestrates the creation of complete microsites:

```javascript
import { MicrositeBuilderAgent } from './src/agents/micrositeBuilderAgent.js';

const results = await MicrositeBuilderAgent.buildMicrosite(
  tenantId,
  ['Topic 1', 'Topic 2', 'Topic 3']
);
```

Tasks:
- Generate keywords for each topic
- Generate long-form content (1000-2000 words)
- Generate UX layouts
- Create pages
- Build internal linking
- Update sitemap

### 2. UX Designer Agent

Converts content into optimal UX layouts:

```javascript
import { UXDesignerAgent } from './src/agents/uxDesignerAgent.js';

const layout = await UXDesignerAgent.designLayout(
  content,
  'standard',
  { layout: 'ModernArticle' }
);
```

Tasks:
- Convert content to UX layout JSON
- Choose component hierarchy
- Optimize spacing and grids
- Suggest images

### 3. Content Updater Agent

Refreshes and improves existing content:

```javascript
import { ContentUpdaterAgent } from './src/agents/contentUpdaterAgent.js';

const page = await ContentUpdaterAgent.refreshPage(pageId);
```

Tasks:
- Refresh content
- Expand sections
- Improve metadata
- Rebuild internal links

## 🎯 Usage Examples

### Creating a Tenant and First Page

1. Register an admin user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","name":"Admin"}'
```

2. Login to get token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

3. Create a tenant:
```bash
curl -X POST http://localhost:5000/api/tenants \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Site",
    "domain": "example.com",
    "settings": {
      "colors": {
        "primary": "#007bff",
        "text": "#212529",
        "background": "#ffffff"
      }
    }
  }'
```

4. Create a page:
```bash
curl -X POST http://localhost:5000/api/pages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "<tenant-id>",
    "title": "Welcome",
    "slug": "home",
    "content": "Welcome to our site...",
    "meta": {
      "title": "Welcome - My Site",
      "description": "Welcome page description"
    }
  }'
```

5. Access the page:
   - For local development: `http://localhost:3000/home?domain=example.com`
   - In production: `https://example.com/home`

### Using AI Tools

Generate keywords:
```bash
curl -X POST http://localhost:5000/api/tools/generateKeywords \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Web Development",
    "count": 10,
    "tenantId": "<tenant-id>"
  }'
```

Generate UX layout:
```bash
curl -X POST http://localhost:5000/api/tools/generateUXLayout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your long form content here...",
    "style": "standard"
  }'
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `NODE_ENV`: Environment (development/production)

**Frontend (.env):**
- `VITE_API_URL`: Backend API URL (default: http://localhost:5000/api)

### MongoDB Setup

1. Install MongoDB locally or use MongoDB Atlas
2. Update `MONGODB_URI` in backend `.env`
3. The application will create the database automatically

### OpenAI Setup

1. Get an API key from https://platform.openai.com/
2. Add it to backend `.env` as `OPENAI_API_KEY`
3. AI features will work automatically

## 🚀 Production Deployment

### Backend

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Use a production MongoDB instance
4. Set up process manager (PM2, systemd, etc.)
5. Configure reverse proxy (nginx, Apache)

### Frontend

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Serve the `dist` folder with a web server (nginx, Apache, etc.)
3. Configure API proxy to backend
4. Set up domain-based routing for multi-tenant

### Multi-Tenant Domain Setup

For production, configure DNS and reverse proxy:

1. Each tenant domain should point to your server
2. Use nginx/Apache to route based on domain
3. Frontend automatically detects tenant from `window.location.hostname`
4. Backend uses `x-tenant-domain` header or `host` header

## 📝 Development

### Running in Development

Backend:
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

Frontend:
```bash
cd frontend
npm run dev  # Vite dev server with hot reload
```

### Testing

Test API endpoints using:
- Postman
- curl
- Thunder Client (VS Code extension)
- Frontend application

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running
- Check `MONGODB_URI` is correct
- Verify network/firewall settings

### OpenAI API Errors

- Verify API key is correct
- Check API quota/limits
- Ensure internet connectivity

### Frontend Not Loading Tenant

- Check backend is running
- Verify domain in URL or query param
- Check browser console for errors
- Ensure CORS is configured correctly

## 📄 License

ISC

## 🤝 Contributing

This is a production-grade platform. Contributions welcome!

## 📞 Support

For issues and questions, please open an issue in the repository.

---

**Built with ❤️ using Node.js, Express, MongoDB, React, TypeScript, and OpenAI**

