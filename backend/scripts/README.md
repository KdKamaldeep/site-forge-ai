# Database Seed Scripts

## Seed Script

The seed script populates the database with sample data for development and testing.

### What it creates:

1. **3 Themes**
   - Default Theme
   - Minimal Theme
   - Modern Theme

2. **3 Tenants**
   - Tech Blog (techblog.example.com)
   - Business Solutions (business.example.com)
   - Creative Studio (creative.example.com)

3. **4 Pages per Tenant** (12 total pages)
   - Home
   - About
   - Services
   - Contact

4. **1 Admin User**
   - Email: `admin@example.com`
   - Password: `admin123`

### Usage

```bash
# Run the seed script
npm run seed
```

### Important Notes

- The script will **DELETE all existing data** before seeding
- Make sure your `.env` file is configured with the correct `MONGODB_URI`
- The admin password will be automatically hashed by bcrypt
- All tenants are assigned a theme automatically

### Customization

You can modify `scripts/seed.js` to:
- Add more tenants
- Add more pages
- Change theme configurations
- Add more admin users
- Customize sample data

### Testing the Seeded Data

After running the seed script, you can:

1. **Login as admin:**
   ```bash
   POST http://localhost:5000/api/auth/login
   {
     "email": "admin@example.com",
     "password": "admin123"
   }
   ```

2. **Get tenant by domain:**
   ```bash
   GET http://localhost:5000/api/tenants/domain/techblog.example.com
   ```

3. **Get pages for a tenant:**
   ```bash
   GET http://localhost:5000/api/pages/list/{tenantId}
   ```

4. **View a page:**
   ```bash
   GET http://localhost:5000/api/pages/{tenantId}/home
   ```

### Development Domains

For local development, you can test multi-tenant by:

1. **Using query parameter:**
   ```
   http://localhost:3000?domain=techblog.example.com
   ```

2. **Or modify your hosts file:**
   ```
   127.0.0.1 techblog.example.com
   127.0.0.1 business.example.com
   127.0.0.1 creative.example.com
   ```

Then access:
- http://techblog.example.com:3000
- http://business.example.com:3000
- http://creative.example.com:3000

