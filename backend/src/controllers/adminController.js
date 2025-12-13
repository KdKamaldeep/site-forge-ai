import { TenantService } from '../services/TenantService.js';
import { PageService } from '../services/PageService.js';
import { ThemeService } from '../services/ThemeService.js';
import { NavigationService } from '../services/NavigationService.js';
import { AIAuditService } from '../services/AIAuditService.js';
import AdminUser from '../models/AdminUser.js';

export class AdminController {
  /**
   * Serve admin login page
   */
  static serveLogin(req, res) {
    const error = req.query.error || null;
    res.render('admin/login', { error });
  }

  /**
   * Serve admin dashboard with data
   */
  static async serveDashboard(req, res, next) {
    try {
      const tenants = await TenantService.listTenants();
      const themes = await ThemeService.listThemes();
      const admins = await AdminUser.find().select('-password');

      // Get total pages count
      const allPagesPromises = tenants.map(tenant => 
        PageService.getAllPagesForTenant(tenant._id.toString())
      );
      const allPagesArrays = await Promise.all(allPagesPromises);
      const totalPages = allPagesArrays.flat().length;

      const stats = {
        tenants: {
          total: tenants.length,
          recent: tenants.slice(0, 5).map(t => ({
            id: t._id,
            name: t.name,
            domain: t.domain,
            createdAt: t.createdAt
          }))
        },
        pages: {
          total: totalPages
        },
        themes: {
          total: themes.length
        },
        admins: {
          total: admins.length
        }
      };

      const allTenants = tenants; // For sidebar
      res.render('admin/dashboard', { 
        stats, 
        user: req.user, 
        tenants,
        allTenants: allTenants, // For sidebar
        title: 'Dashboard',
        pageTitle: 'Dashboard',
        activePage: 'dashboard'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve admin pages management with data
   */
  static async servePages(req, res, next) {
    try {
      const { tenantId } = req.query;
      let pages = [];
      const tenants = await TenantService.listTenants();

      if (tenantId) {
        pages = await PageService.listPages(tenantId);
      } else {
        // Get pages from all tenants
        const allPagesPromises = tenants.map(tenant => 
          PageService.listPages(tenant._id.toString())
        );
        const allPagesArrays = await Promise.all(allPagesPromises);
        pages = allPagesArrays.flat();
      }

      // Enrich pages with tenant info
      const pagesWithTenant = pages.map(page => {
        const tenant = tenants.find(t => t._id.toString() === page.tenantId.toString());
        return {
          ...page.toObject(),
          tenantName: tenant?.name || 'Unknown',
          tenantDomain: tenant?.domain || 'Unknown'
        };
      });

      res.render('admin/pages', { 
        pages: pagesWithTenant, 
        tenants,
        selectedTenantId: tenantId || '',
        user: req.user,
        title: 'Manage Pages',
        pageTitle: 'Manage Pages',
        activePage: 'pages',
        allTenants: tenants // For sidebar
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve admin tenants management with data
   */
  static async serveTenants(req, res, next) {
    try {
      const tenants = await TenantService.listTenants();
      const themes = await ThemeService.listThemes();
      res.render('admin/tenants', { 
        tenants, 
        themes, 
        user: req.user,
        title: 'Manage Tenants',
        pageTitle: 'Manage Tenants',
        activePage: 'tenants',
        success: req.query.success ? decodeURIComponent(req.query.success) : null,
        error: req.query.error ? decodeURIComponent(req.query.error) : null,
        allTenants: tenants // For sidebar
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve edit tenant page
   */
  static async serveEditTenant(req, res, next) {
    try {
      const { id } = req.params;
      const themes = await ThemeService.listThemes();
      
      const allTenants = await TenantService.listTenants(); // Get all tenants for sidebar
      
      // Check if this is a "new" tenant request (no id param or id is 'new')
      if (!id || id === 'new') {
        return res.render('admin/tenant-edit', { 
          tenant: null, 
          themes,
          user: req.user,
          title: 'Create Tenant',
          pageTitle: 'Create Tenant',
          activePage: 'tenants',
          allTenants: allTenants // For sidebar
        });
      }

      // Validate id is a valid MongoDB ObjectId
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.redirect('/admin/tenants?error=Invalid+tenant+ID');
      }

      const tenant = await TenantService.getTenantById(id);
      if (!tenant) {
        return res.redirect('/admin/tenants?error=Tenant+not+found');
      }
      
      res.render('admin/tenant-edit', { 
        tenant, 
        themes, 
        user: req.user,
        title: 'Edit Tenant',
        pageTitle: 'Edit Tenant',
        activePage: 'tenants',
        allTenants: allTenants // For sidebar
      });
    } catch (error) {
      console.error('Error serving edit tenant:', error);
      next(error);
    }
  }

  /**
   * Handle tenant save (create/update)
   */
  static async handleTenantSave(req, res, next) {
    try {
      const { id } = req.params || {};
      const isNew = !id || id === 'new';
      const { 
        name, 
        domain, 
        themeId, 
        primaryColor, 
        textColor, 
        bgColor,
        secondaryColor,
        accentColor,
        logo,
        layoutStyle,
        googleAnalyticsId,
        adsenseId,
        googleSearchConsoleVerified
      } = req.body;

      const theme = {
        colors: {
          primary: primaryColor || '#007bff',
          secondary: secondaryColor || '#6c757d',
          text: textColor || '#212529',
          background: bgColor || '#ffffff',
          accent: accentColor || '#28a745'
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          headingFont: 'Arial, sans-serif',
          fontSize: '16px'
        }
      };

      // Parse Brand Identity
      const brandIdentity = {
        brandName: req.body.brandName || null,
        tagline: req.body.tagline || null,
        language: req.body.language || 'en',
        country: req.body.country || 'Global',
        region: req.body.region || null,
        tone: req.body.tone || 'friendly'
      };

      // Parse Navigation (array of nav items)
      const navigation = [];
      const navLabels = Array.isArray(req.body['navLabel[]']) ? req.body['navLabel[]'] : (req.body['navLabel[]'] ? [req.body['navLabel[]']] : []);
      const navPaths = Array.isArray(req.body['navPath[]']) ? req.body['navPath[]'] : (req.body['navPath[]'] ? [req.body['navPath[]']] : []);
      const navCategoryKeys = Array.isArray(req.body['navCategoryKey[]']) ? req.body['navCategoryKey[]'] : (req.body['navCategoryKey[]'] ? [req.body['navCategoryKey[]']] : []);
      const navIcons = Array.isArray(req.body['navIcon[]']) ? req.body['navIcon[]'] : (req.body['navIcon[]'] ? [req.body['navIcon[]']] : []);
      
      for (let i = 0; i < navLabels.length; i++) {
        if (navLabels[i] && navPaths[i] && navCategoryKeys[i]) {
          navigation.push({
            label: navLabels[i],
            path: navPaths[i],
            categoryKey: navCategoryKeys[i],
            icon: navIcons[i] || null,
            order: i
          });
        }
      }

      // Parse Content Pillars
      const contentPillars = [];
      const pillarCategoryKeys = Array.isArray(req.body['pillarCategoryKey[]']) ? req.body['pillarCategoryKey[]'] : (req.body['pillarCategoryKey[]'] ? [req.body['pillarCategoryKey[]']] : []);
      const pillarDescriptions = Array.isArray(req.body['pillarDescription[]']) ? req.body['pillarDescription[]'] : (req.body['pillarDescription[]'] ? [req.body['pillarDescription[]']] : []);
      const pillarSeedKeywords = Array.isArray(req.body['pillarSeedKeywords[]']) ? req.body['pillarSeedKeywords[]'] : (req.body['pillarSeedKeywords[]'] ? [req.body['pillarSeedKeywords[]']] : []);
      const pillarMonetizationModes = Array.isArray(req.body['pillarMonetizationMode[]']) ? req.body['pillarMonetizationMode[]'] : (req.body['pillarMonetizationMode[]'] ? [req.body['pillarMonetizationMode[]']] : []);
      const pillarPostingRates = Array.isArray(req.body['pillarPostingRate[]']) ? req.body['pillarPostingRate[]'] : (req.body['pillarPostingRate[]'] ? [req.body['pillarPostingRate[]']] : []);

      for (let i = 0; i < pillarCategoryKeys.length; i++) {
        if (pillarCategoryKeys[i] && pillarDescriptions[i] && pillarSeedKeywords[i]) {
          const keywords = pillarSeedKeywords[i].split(',').map(k => k.trim()).filter(k => k);
          contentPillars.push({
            categoryKey: pillarCategoryKeys[i],
            description: pillarDescriptions[i],
            seedKeywords: keywords,
            monetizationMode: pillarMonetizationModes[i] || 'adsense',
            postingRatePerWeek: parseInt(pillarPostingRates[i]) || 2
          });
        }
      }

      // Parse Monetization
      const monetization = {
        primary: req.body.monetizationPrimary || 'adsense',
        affiliateProviders: req.body.affiliateProviders ? req.body.affiliateProviders.split(',').map(p => p.trim()).filter(p => p) : [],
        ctaStyle: req.body.ctaStyle || 'form'
      };

      // Parse Compliance
      const compliance = {
        forbiddenTopics: req.body.forbiddenTopics ? req.body.forbiddenTopics.split(',').map(t => t.trim()).filter(t => t) : [],
        medicalDisclaimer: req.body.medicalDisclaimer === 'true' || req.body.medicalDisclaimer === true,
        legalDisclaimer: req.body.legalDisclaimer === 'true' || req.body.legalDisclaimer === true,
        noFakePricing: req.body.noFakePricing === 'true' || req.body.noFakePricing === true,
        noGuaranteedResults: req.body.noGuaranteedResults === 'true' || req.body.noGuaranteedResults === true,
        adSenseCompliant: req.body.adSenseCompliant === 'true' || req.body.adSenseCompliant === true
      };

      // Parse Publishing Strategy
      const publishingStrategy = {
        pagesPerWeek: parseInt(req.body.pagesPerWeek) || 2,
        randomizePublishTime: req.body.randomizePublishTime === 'true' || req.body.randomizePublishTime === true,
        autoPublish: req.body.autoPublish === 'true' || req.body.autoPublish === true
      };

      const tenantData = {
        name,
        domain,
        themeId: themeId || null,
        theme,
        logo: logo || null,
        layoutStyle: layoutStyle || null,
        googleAnalyticsId: googleAnalyticsId || null,
        adsenseId: adsenseId || null,
        googleSearchConsoleVerified: googleSearchConsoleVerified === 'true' || googleSearchConsoleVerified === true,
        brandIdentity,
        navigation,
        contentPillars,
        monetization,
        compliance,
        publishingStrategy
      };

      if (isNew) {
        // Create new tenant
        const tenant = await TenantService.createTenant(tenantData);
        return res.redirect('/admin/tenants?success=Tenant+created+successfully');
      } else {
        // Update existing tenant
        const tenant = await TenantService.getTenantById(id);
        if (!tenant) {
          return res.redirect('/admin/tenants?error=Tenant+not+found');
        }

        // Update all fields
        if (themeId) {
          await TenantService.updateTheme(id, themeId);
        }
        
        // Update tenant directly with new fields
        tenant.name = name;
        tenant.domain = domain;
        tenant.theme = theme;
        tenant.logo = logo || null;
        tenant.layoutStyle = layoutStyle || null;
        tenant.googleAnalyticsId = googleAnalyticsId || null;
        tenant.adsenseId = adsenseId || null;
        tenant.googleSearchConsoleVerified = googleSearchConsoleVerified === 'true' || googleSearchConsoleVerified === true;
        tenant.brandIdentity = brandIdentity;
        tenant.navigation = navigation;
        tenant.contentPillars = contentPillars;
        tenant.monetization = monetization;
        tenant.compliance = compliance;
        tenant.publishingStrategy = publishingStrategy;
        await tenant.save();

        return res.redirect('/admin/tenants?success=Tenant+updated+successfully');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle tenant delete
   */
  static async handleTenantDelete(req, res, next) {
    try {
      const { id } = req.params;
      await TenantService.deleteTenant(id);
      res.redirect('/admin/tenants?success=Tenant+deleted+successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve edit page form
   */
  static async serveEditPage(req, res, next) {
    try {
      const { id } = req.params;
      const tenants = await TenantService.listTenants();
      const allTenants = await TenantService.listTenants(); // For sidebar

      if (!id || id === 'new') {
        return res.render('admin/page-edit', { 
          page: null, 
          tenants,
          user: req.user,
          title: 'Create Page',
          pageTitle: 'Create Page',
          activePage: 'pages',
          allTenants: allTenants // For sidebar
        });
      }

      const page = await PageService.getPageById(id);
      if (!page) {
        return res.redirect('/admin/pages?error=Page not found');
      }

      // Convert page to plain object to ensure all fields are accessible in EJS
      const pageData = page.toObject ? page.toObject() : page;

      res.render('admin/page-edit', { 
        page: pageData, 
        tenants, 
        user: req.user,
        title: 'Edit Page',
        pageTitle: 'Edit Page',
        activePage: 'pages',
        allTenants: allTenants // For sidebar
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle page save (create/update)
   */
  static async handlePageSave(req, res, next) {
    try {
      const { id } = req.params || {};
      const isNew = !id || id === 'new';
      const { 
        tenantId, 
        title, 
        slug, 
        content, 
        metaTitle, 
        metaDescription, 
        metaKeywords,
        ogImage,
        isHome,
        uxLayout,
        // E-E-A-T fields
        authorName,
        authorBio,
        authorExpertise,
        citations,
        // Ad zones
        adZones
      } = req.body;

      // Parse UX Layout JSON
      let parsedUxLayout = { sections: [] };
      if (uxLayout) {
        try {
          parsedUxLayout = JSON.parse(uxLayout);
        } catch (parseError) {
          return res.redirect(`/admin/pages/${isNew ? 'new' : 'edit/' + id}?error=Invalid+UX+Layout+JSON`);
        }
      }

      // Build meta object with E-E-A-T
      const meta = {
        title: metaTitle || title,
        description: metaDescription || '',
        keywords: metaKeywords ? metaKeywords.split(',').map(k => k.trim()).filter(k => k) : [],
        ogImage: ogImage || null,
        author: {
          name: authorName || null,
          bio: authorBio || null,
          expertise: authorExpertise ? authorExpertise.split(',').map(e => e.trim()).filter(e => e) : []
        },
        citations: citations ? citations.split('\n').map(c => c.trim()).filter(c => c) : [],
        lastReviewed: new Date()
      };

      // Calculate word count and reading time
      const wordCount = content ? content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length : 0;
      const readingTime = Math.ceil(wordCount / 200);

      // Parse ad zones
      const adZonesArray = adZones ? (Array.isArray(adZones) ? adZones : [adZones]) : ['above-content', 'mid-content', 'below-content'];

      // Prepare page data
      const pageData = {
        tenantId,
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        content,
        meta,
        isHome: isHome === 'true' || isHome === true,
        uxLayout: parsedUxLayout,
        wordCount,
        readingTime,
        adZones: adZonesArray
      };

      if (isNew) {
        // Create new page
        await PageService.createPage(pageData);
        return res.redirect('/admin/pages?success=Page+created+successfully');
      } else {
        // Update existing page
        await PageService.updatePage(id, pageData);
        return res.redirect('/admin/pages?success=Page+updated+successfully');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle page delete
   */
  static async handlePageDelete(req, res, next) {
    try {
      const { id } = req.params;
      await PageService.deletePage(id);
      res.redirect('/admin/pages?success=Page+deleted+successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve admin themes management with data
   */
  static async serveThemes(req, res, next) {
    try {
      const themes = await ThemeService.listThemes();
      const allTenants = await TenantService.listTenants(); // For sidebar
      res.render('admin/themes', { 
        themes, 
        user: req.user,
        title: 'Manage Themes',
        pageTitle: 'Manage Themes',
        activePage: 'themes',
        success: req.query.success ? decodeURIComponent(req.query.success) : null,
        error: req.query.error ? decodeURIComponent(req.query.error) : null,
        allTenants: allTenants // For sidebar
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve edit theme page
   */
  static async serveEditTheme(req, res, next) {
    try {
      const { id } = req.params;

      const allTenants = await TenantService.listTenants(); // For sidebar
      
      if (!id || id === 'new') {
        return res.render('admin/theme-edit', { 
          theme: null,
          user: req.user,
          title: 'Create Theme',
          pageTitle: 'Create Theme',
          activePage: 'themes',
          allTenants: allTenants // For sidebar
        });
      }

      const theme = await ThemeService.getThemeById(id);
      if (!theme) {
        return res.redirect('/admin/themes?error=Theme not found');
      }

      res.render('admin/theme-edit', { 
        theme, 
        user: req.user,
        title: 'Edit Theme',
        pageTitle: 'Edit Theme',
        activePage: 'themes',
        allTenants: allTenants // For sidebar
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle theme save (create/update)
   */
  static async handleThemeSave(req, res, next) {
    try {
      const { id } = req.params || {};
      const isNew = !id || id === 'new';
      const { name, description } = req.body;

      if (isNew) {
        // Create new theme
        await ThemeService.createTheme({
          name,
          description: description || '',
          components: {},
          styles: {}
        });
        return res.redirect('/admin/themes?success=Theme+created+successfully');
      } else {
        // Update existing theme
        await ThemeService.updateTheme(id, {
          name,
          description: description || ''
        });
        return res.redirect('/admin/themes?success=Theme+updated+successfully');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle theme delete
   */
  static async handleThemeDelete(req, res, next) {
    try {
      const { id } = req.params;
      await ThemeService.deleteTheme(id);
      res.redirect('/admin/themes?success=Theme+deleted+successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve admin navigation management with data
   */
  static async serveNavigation(req, res, next) {
    try {
      const { tenantId } = req.query;
      const tenants = await TenantService.listTenants();
      let navigations = [];

      if (tenantId) {
        const navigation = await NavigationService.getNavigation(tenantId);
        if (navigation) {
          const tenant = tenants.find(t => t._id.toString() === tenantId);
          navigations = [{
            ...navigation,
            tenantId,
            tenantName: tenant?.name || 'Unknown',
            tenantDomain: tenant?.domain || 'Unknown'
          }];
        }
      } else {
        // Get navigation from all tenants
        const allNavPromises = tenants.map(async tenant => {
          const nav = await NavigationService.getNavigation(tenant._id.toString());
          if (nav) {
            return {
              ...nav,
              tenantId: tenant._id.toString(),
              tenantName: tenant.name,
              tenantDomain: tenant.domain
            };
          }
          return null;
        });
        const allNavs = await Promise.all(allNavPromises);
        navigations = allNavs.filter(nav => nav !== null);
      }

      res.render('admin/navigation', { 
        navigations, 
        tenants,
        selectedTenantId: tenantId || '',
        user: req.user,
        title: 'Manage Navigation',
        pageTitle: 'Manage Navigation',
        activePage: 'navigation',
        allTenants: tenants // For sidebar
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve edit navigation page
   */
  static async serveEditNavigation(req, res, next) {
    try {
      const { tenantId } = req.params;
      const tenants = await TenantService.listTenants();
      const allTenants = await TenantService.listTenants();
      const pages = await PageService.listPages(tenantId);

      const navigation = await NavigationService.getNavigation(tenantId);
      const tenant = tenants.find(t => t._id.toString() === tenantId);

      if (!tenant) {
        return res.redirect('/admin/navigation?error=Tenant+not+found');
      }

      res.render('admin/navigation-edit', { 
        navigation: navigation || { menu: [], cta: { label: null, url: null }, logo: null },
        tenant,
        pages,
        tenantId,
        user: req.user,
        title: 'Edit Navigation',
        pageTitle: 'Edit Navigation',
        activePage: 'navigation',
        allTenants: allTenants
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle navigation save (create/update)
   */
  static async handleNavigationSave(req, res, next) {
    try {
      const { tenantId } = req.params;
      const { logo, ctaLabel, ctaUrl } = req.body;

      // Parse menu items from form data
      let menuArray = [];
      if (req.body.menuItems && Array.isArray(req.body.menuItems)) {
        menuArray = req.body.menuItems
          .filter(item => item && item.trim()) // Filter out empty items
          .map(item => {
            try {
              // Try to parse as JSON
              const parsed = JSON.parse(item);
              if (parsed.label && parsed.slug) {
                return parsed;
              }
              throw new Error('Invalid format');
            } catch (e) {
              // If not valid JSON, create a simple menu item
              // This shouldn't happen if form validation works, but handle it gracefully
              return {
                label: item,
                slug: item.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              };
            }
          });
      }

      await NavigationService.upsertNavigation(tenantId, {
        logo: logo || null,
        menu: menuArray,
        cta: {
          label: ctaLabel || null,
          url: ctaUrl || null
        }
      });

      res.redirect(`/admin/navigation?tenantId=${tenantId}&success=Navigation+updated+successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle navigation delete
   */
  static async handleNavigationDelete(req, res, next) {
    try {
      const { tenantId } = req.params;
      await NavigationService.deleteNavigation(tenantId);
      res.redirect('/admin/navigation?success=Navigation+deleted+successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve AI audit logs page
   */
  static async serveAudit(req, res, next) {
    try {
      const { tenantId, service, status, operation, page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filters = {
        tenantId: tenantId || null,
        service: service || null,
        status: status || null,
        operation: operation || null,
        limit: parseInt(limit),
        skip
      };

      const { logs, total } = await AIAuditService.getLogs(filters);
      const stats = await AIAuditService.getStatistics({ tenantId: tenantId || null });

      const tenants = await TenantService.listTenants();

      res.render('admin/audit', {
        logs,
        stats,
        tenants,
        allTenants: tenants, // For sidebar
        filters: {
          tenantId: tenantId || '',
          service: service || '',
          status: status || '',
          operation: operation || ''
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        },
        user: req.user,
        title: 'AI Audit Logs',
        pageTitle: 'AI Audit Logs',
        activePage: 'audit'
      });
    } catch (error) {
      next(error);
    }
  }
}
