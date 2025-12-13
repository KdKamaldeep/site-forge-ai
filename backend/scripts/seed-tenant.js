/**
 * Seed script for SmartHomeBasics tenant
 * Creates a tenant with complete Site DNA configuration
 *
 * Usage: node scripts/seed-SmartHomeBasics.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

async function seedSmartHomeBasics() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const DOMAIN = 'SmartHomeBasics.com';

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({ domain: DOMAIN });
    if (existingTenant) {
      console.log(`⚠️  Tenant "${DOMAIN}" already exists. Deleting...`);
      await Tenant.deleteOne({ domain: DOMAIN });
      console.log('✅ Deleted existing tenant');
    }

    // Prepare tenant data
    const tenantData = {
      name: 'SmartHomeBasics',
      domain: DOMAIN,
      logo: `https://${DOMAIN}/logo.png`,
      layoutStyle: null, // Use default/auto behavior
      theme: {
        colors: {
          primary: '#0F172A',     // slate-900
          secondary: '#06B6D4',   // cyan-500
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
        brandName: 'Smart Home Basics',
        tagline: 'Simple guides for smarter homes',
        language: 'en',
        country: 'Global',
        region: '',
        tone: 'practical'
      },

      // Navigation
      navigation: [
        { label: 'Home Maintenance', path: '/home-maintenance', categoryKey: 'home-maintenance', icon: '', order: 0 },
        { label: 'Appliances',       path: '/appliances',       categoryKey: 'appliances',       icon: '', order: 1 },
        { label: 'Energy Saving',    path: '/energy-saving',    categoryKey: 'energy-saving',    icon: '', order: 2 },
        { label: 'Safety Basics',    path: '/safety-basics',    categoryKey: 'safety-basics',    icon: '', order: 3 },
        { label: 'How It Works',     path: '/how-it-works',     categoryKey: 'how-it-works',     icon: '', order: 4 }
      ],

      // Content Pillars
      contentPillars: [
        {
          categoryKey: 'home-maintenance',
          description: 'Simple home upkeep guides, checklists, and common fixes for everyday homeowners/renters.',
          seedKeywords: [
            'home maintenance checklist',
            'seasonal home care',
            'preventive maintenance tips',
            'mold prevention at home',
            'water leakage basics',
            'wall dampness causes',
            'paint peeling reasons',
            'basic DIY home care',
            'home inspection tips'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'appliances',
          description: 'Practical appliance guides: usage tips, cleaning, troubleshooting basics, and buying decisions.',
          seedKeywords: [
            'how to clean washing machine',
            'refrigerator maintenance',
            'ac servicing basics',
            'inverter vs non inverter',
            'microwave safety tips',
            'water purifier maintenance',
            'appliance troubleshooting',
            'best practices for appliances'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'energy-saving',
          description: 'Easy ways to reduce energy bills with practical comparisons and habits (no promises).',
          seedKeywords: [
            'save electricity at home',
            'reduce power bill',
            'energy efficient appliances',
            'led vs cfl comparison',
            'ac temperature best setting',
            'inverter savings explained',
            'standby power usage',
            'home energy audit basics'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'safety-basics',
          description: 'Home safety basics: electrical, gas, fire prevention, and simple precautions.',
          seedKeywords: [
            'electrical safety at home',
            'short circuit prevention',
            'gas leakage safety',
            'fire safety checklist home',
            'childproofing home basics',
            'bathroom safety tips',
            'kitchen safety habits',
            'extension cord safety'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 1
        },
        {
          categoryKey: 'how-it-works',
          description: 'Simple explanations of how common home systems and appliances work.',
          seedKeywords: [
            'how inverter works',
            'how refrigerator works',
            'how water heater works',
            'how air conditioner works',
            'how water purifier works',
            'how circuit breaker works',
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

    // Create tenant
    const tenant = new Tenant(tenantData);
    await tenant.save();

    console.log('✅ SmartHomeBasics tenant created successfully!');
    console.log(`   Tenant ID: ${tenant._id}`);
    console.log(`   Domain: ${tenant.domain}`);
    console.log(`   Name: ${tenant.name}`);
    console.log(`   Categories: ${tenant.contentPillars.length}`);
    console.log(`   Navigation items: ${tenant.navigation.length}`);
    console.log(`   Publishing: ${tenant.publishingStrategy.pagesPerWeek} pages/week`);

    console.log('\n📋 Site DNA Summary:');
    console.log(`   Brand: ${tenant.brandIdentity.brandName} - ${tenant.brandIdentity.tagline}`);
    console.log(`   Language: ${tenant.brandIdentity.language}, Country: ${tenant.brandIdentity.country}`);
    console.log(`   Tone: ${tenant.brandIdentity.tone}`);
    console.log(`   Monetization: ${tenant.monetization.primary}`);
    console.log(`   Compliance: Medical disclaimer: ${tenant.compliance.medicalDisclaimer}, Legal disclaimer: ${tenant.compliance.legalDisclaimer}`);

    console.log('\n🎯 Content Categories:');
    tenant.contentPillars.forEach((pillar, index) => {
      console.log(`   ${index + 1}. ${pillar.categoryKey}: ${pillar.postingRatePerWeek} posts/week, ${pillar.seedKeywords.length} seed keywords`);
    });

    console.log('\n✅ Seed completed successfully!');
    console.log(`\n🌐 Access the tenant at: http://localhost:3000 (if frontend is configured)`);
    console.log(`📊 Admin panel: http://localhost:5000/admin/tenants/edit/${tenant._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tenant:', error);
    process.exit(1);
  }
}

// Run the seed
seedSmartHomeBasics();
