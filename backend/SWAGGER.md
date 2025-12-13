# Swagger API Documentation

## Overview

The backend API is fully documented with Swagger/OpenAPI 3.0. Access the interactive API documentation at:

**URL:** `http://localhost:5000/api-docs`

## Features

- ✅ **Interactive API Explorer** - Test endpoints directly from the browser
- ✅ **Complete Schema Definitions** - All request/response models documented
- ✅ **Authentication Support** - JWT bearer token authentication
- ✅ **Request/Response Examples** - Example payloads for all endpoints
- ✅ **Error Documentation** - All error responses documented
- ✅ **Tagged Endpoints** - Organized by functionality (Tenants, Pages, Navigation, etc.)

## Accessing Swagger UI

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000/api-docs
   ```

3. Explore the API:
   - Browse endpoints by tag
   - View request/response schemas
   - Test endpoints directly (requires authentication for protected routes)
   - Download OpenAPI spec

## Authentication in Swagger

To test protected endpoints:

1. Click the **"Authorize"** button at the top
2. Enter your JWT token in the format: `Bearer YOUR_TOKEN_HERE`
3. Click **"Authorize"**
4. Now you can test protected endpoints

## Documented Endpoints

### Tenants
- `GET /api/tenants/domain/:domain` - Get tenant by domain

### Pages
- `GET /api/pages/:tenantId/:slug` - Get page by slug
- `GET /api/pages/home/:tenantId` - Get homepage
- `GET /api/pages/list/:tenantId` - List all pages

### Navigation
- `GET /api/navigation/:tenantId` - Get navigation configuration

### Revalidate
- `POST /api/revalidate` - Revalidate Next.js ISR cache

## Schema Definitions

All schemas are defined in `backend/src/config/swagger.js`:

- **Tenant** - Tenant object with theme and settings
- **Page** - Page object with content, meta, and UX layout
- **PageList** - List of pages with slug and title
- **Navigation** - Navigation configuration with menu and CTA
- **RevalidateRequest** - Revalidation request body
- **RevalidateResponse** - Revalidation response
- **Error** - Standard error response

## Adding New Endpoints

To document a new endpoint, add Swagger annotations to the route file:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Your endpoint summary
 *     description: Detailed description
 *     tags: [YourTag]
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YourSchema'
 */
router.get('/your-endpoint', YourController.method);
```

## Exporting OpenAPI Spec

The OpenAPI specification is available at:
```
http://localhost:5000/api-docs/swagger.json
```

You can use this spec with:
- Postman (import OpenAPI spec)
- Insomnia
- Other API testing tools
- Code generation tools

## Customization

Swagger configuration is in `backend/src/config/swagger.js`. You can customize:

- API info (title, version, description)
- Server URLs
- Schema definitions
- Tags and organization
- Security schemes

## Production Considerations

For production:

1. **Restrict Access**: Consider adding authentication to `/api-docs` endpoint
2. **Environment-Specific URLs**: Update server URLs in swagger config
3. **Hide Sensitive Info**: Remove or obfuscate sensitive endpoints if needed
4. **Rate Limiting**: Apply rate limiting to Swagger UI if public

## Example: Testing an Endpoint

1. Navigate to `http://localhost:5000/api-docs`
2. Find the endpoint you want to test (e.g., "Get tenant by domain")
3. Click "Try it out"
4. Enter parameters (e.g., domain: "mysite.example.com")
5. Click "Execute"
6. View the response below

## Troubleshooting

**Swagger UI not loading?**
- Check that `swagger-jsdoc` and `swagger-ui-express` are installed
- Verify the route is mounted in `server.js`
- Check console for errors

**Endpoints not showing?**
- Verify Swagger annotations are in route files
- Check that route files are included in `apis` array in swagger config
- Ensure JSDoc comments are properly formatted

**Authentication not working?**
- Make sure you're using `Bearer TOKEN` format
- Verify token is valid and not expired
- Check that `authMiddleware` is properly configured

