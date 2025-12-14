/**
 * Seed script for SmartHomeTricks tenant (NEW)
 * Creates a tenant with complete Site DNA configuration
 *
 * Usage: node scripts/seed-SmartHomeTricks.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

async function seedSmartHomeTricks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const DOMAIN = 'SmartHomeTricks.com';

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({ domain: DOMAIN });
    const isUpdate = !!existingTenant;

    // Prepare tenant data
    const tenantData = {
      name: 'SmartHomeTricks',
      domain: DOMAIN,
      logo: `https://${DOMAIN}/logo.png`,
      layoutStyle: null, // Use default/auto behavior
      theme: {
        colors: {
          primary: '#0B1220',     // deep slate
          secondary: '#22C55E',   // green-500
          text: '#0B1220',
          background: '#FFFFFF',
          accent: '#F97316'       // orange-500
        },
        typography: {
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          headingFont: 'Poppins, Inter, system-ui, sans-serif',
          fontSize: '16px'
        }
      },

      // Brand Identity
      brandIdentity: {
        brandName: 'Smart Home Tricks',
        tagline: 'Quick fixes, smarter living',
        language: 'en',
        country: 'Global',
        region: '',
        tone: 'practical'
      },

      // Navigation
      navigation: [
        { label: 'Smart Devices',    path: '/smart-devices',    categoryKey: 'smart-devices',    icon: '', order: 0 },
        { label: 'DIY & Fixes',      path: '/diy-fixes',        categoryKey: 'diy-fixes',        icon: '', order: 1 },
        { label: 'Energy & Bills',   path: '/energy-bills',     categoryKey: 'energy-bills',     icon: '', order: 2 },
        { label: 'Home Safety',      path: '/home-safety',      categoryKey: 'home-safety',      icon: '', order: 3 },
        { label: 'How It Works',     path: '/how-it-works',     categoryKey: 'how-it-works',     icon: '', order: 4 }
      ],

      // Standalone Pages
      standalonePages: [
        {
          pageType: 'privacy-policy',
          title: 'Privacy Policy',
          slug: 'privacy-policy',
          description: 'Our privacy policy explains how we collect, use, and protect your personal information.',
          enabled: true
        },
        {
          pageType: 'about-us',
          title: 'About Us',
          slug: 'about-us',
          description: 'Learn more about our mission, values, and the team behind Smart Home Tricks.',
          enabled: true
        },
        {
          pageType: 'contact',
          title: 'Contact Us',
          slug: 'contact',
          description: 'Get in touch with us. We\'d love to hear from you.',
          enabled: true
        },
        {
          pageType: 'cookie-disclosure',
          title: 'Cookie and Advertising Disclosure',
          slug: 'cookie-disclosure',
          description: 'Information about our use of cookies and advertising practices.',
          enabled: true
        }
      ],

      // Content Pillars
      contentPillars: [
        {
          categoryKey: 'smart-devices',
          description: 'Beginner-friendly guides for smart plugs, lights, sensors, routers, and setup tips.',
          seedKeywords: [
            'best smart plugs for beginners',
            'smart light setup guide',
            'wifi extender placement tips',
            'smart door sensor installation',
            'how to automate lights at home',
            'smart thermostat basics',
            'zigbee vs wifi devices',
            'smart home hub for beginners',
            'how to name devices in smart home'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'diy-fixes',
          description: 'Simple home DIY fixes and maintenance tricks (safe, basic, no risky electrical work).',
          seedKeywords: [
            'fix squeaky door quick',
            'remove mold from bathroom safely',
            'stop water tap leaking basics',
            'clean shower drain at home',
            'how to unclog sink without chemicals',
            'remove bad smell from kitchen drain',
            'how to seal window gaps',
            'reduce dust at home tips',
            'clean ceiling fan without mess'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'energy-bills',
          description: 'Practical habits and comparisons to reduce power use without unrealistic promises.',
          seedKeywords: [
            'ac temperature setting for savings',
            'reduce electricity bill in summer',
            'standby power consumption explained',
            'smart plug energy monitoring',
            'led vs tube light power usage',
            'how to use ceiling fan efficiently',
            'refrigerator power saving tips',
            'best time to run washing machine',
            'home energy audit checklist'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'home-safety',
          description: 'Home safety basics: fire safety, gas safety, electrical precautions (non-professional advice).',
          seedKeywords: [
            'smoke detector placement home',
            'gas leakage safety steps',
            'extension cord safety tips',
            'prevent electric shock at home',
            'kitchen fire safety checklist',
            'childproofing home tips',
            'bathroom anti slip safety',
            'how to store cleaning chemicals safely'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 1
        },
        {
          categoryKey: 'how-it-works',
          description: 'Simple explanations of how common home systems and appliances work.',
          seedKeywords: [
            'how circuit breaker works',
            'how inverter works at home',
            'how water purifier works',
            'how refrigerator cooling works',
            'how air conditioner works',
            'how geyser water heater works',
            'how solar panels work basics'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 1
        }
      ],

      // Monetization
      monetization: {
        primary: 'adsense',
        affiliateProviders: ['amazon'],
        ctaStyle: 'form'
      },

      // Compliance
      compliance: {
        forbiddenTopics: [
          'gambling',
          'adult content',
          'illegal activities',
          'medical treatment advice',
          'legal advice',
          'cryptocurrency trading',
          'get rich quick schemes'
        ],
        medicalDisclaimer: true,
        legalDisclaimer: true,
        noFakePricing: true,
        noGuaranteedResults: true,
        adSenseCompliant: true
      },

      // Publishing Strategy
      publishingStrategy: {
        pagesPerWeek: 4,
        randomizePublishTime: true,
        autoPublish: true
      },

      // Analytics placeholders
      googleAnalyticsId: '',
      adsenseId: '',
      googleSearchConsoleVerified: false
    };

    // Create or update tenant
    let tenant;
    if (isUpdate) {
      console.log(`⚠️  Tenant "${DOMAIN}" already exists. Updating...`);
      // Update existing tenant with new data
      Object.assign(existingTenant, tenantData);
      // Preserve existing fields that shouldn't be overwritten
      // Keep existing _id, createdAt, and other system fields
      await existingTenant.save();
      tenant = existingTenant;
      console.log('✅ Updated existing tenant');
    } else {
      // Create new tenant
      tenant = new Tenant(tenantData);
      await tenant.save();
      console.log('✅ SmartHomeTricks tenant created successfully!');
    }
    console.log(`   Tenant ID: ${tenant._id}`);
    console.log(`   Domain: ${tenant.domain}`);
    console.log(`   Name: ${tenant.name}`);
    console.log(`   Categories: ${tenant.contentPillars?.length || 0}`);
    console.log(`   Navigation items: ${tenant.navigation?.length || 0}`);
    console.log(`   Standalone pages: ${tenant.standalonePages?.length || 0}`);
    console.log(`   Publishing: ${tenant.publishingStrategy?.pagesPerWeek || 0} pages/week`);

    console.log('\n📋 Site DNA Summary:');
    console.log(`   Brand: ${tenant.brandIdentity?.brandName || 'N/A'} - ${tenant.brandIdentity?.tagline || 'N/A'}`);
    console.log(`   Language: ${tenant.brandIdentity?.language || 'N/A'}, Country: ${tenant.brandIdentity?.country || 'N/A'}`);
    console.log(`   Tone: ${tenant.brandIdentity?.tone || 'N/A'}`);
    console.log(`   Monetization: ${tenant.monetization?.primary || 'N/A'}`);
    console.log(`   Compliance: Medical disclaimer: ${tenant.compliance?.medicalDisclaimer || false}, Legal disclaimer: ${tenant.compliance?.legalDisclaimer || false}`);

    if (tenant.contentPillars && tenant.contentPillars.length > 0) {
      console.log('\n🎯 Content Categories:');
      tenant.contentPillars.forEach((pillar, index) => {
        console.log(`   ${index + 1}. ${pillar.categoryKey}: ${pillar.postingRatePerWeek} posts/week, ${pillar.seedKeywords?.length || 0} seed keywords`);
      });
    }

    if (tenant.standalonePages && tenant.standalonePages.length > 0) {
      console.log('\n📄 Standalone Pages:');
      tenant.standalonePages.forEach((page, index) => {
        console.log(`   ${index + 1}. ${page.title} (${page.pageType}) - ${page.enabled ? 'Enabled' : 'Disabled'}`);
      });
    }

    console.log(`\n✅ Seed ${isUpdate ? 'updated' : 'completed'} successfully!`);
    console.log(`\n🌐 Access the tenant at: http://localhost:3000 (if frontend is configured)`);
    console.log(`📊 Admin panel: http://localhost:5000/admin/tenants/edit/${tenant._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tenant:', error);
    process.exit(1);
  }
}

// Run the seed
seedSmartHomeTricks();
