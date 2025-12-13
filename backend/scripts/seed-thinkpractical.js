/**
 * Seed script for ThinkPractical tenant
 * Creates a tenant with complete Site DNA configuration
 * 
 * Usage: node scripts/seed-thinkpractical.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

async function seedThinkPractical() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({ domain: 'thinkpractical.com' });
    if (existingTenant) {
      console.log('⚠️  Tenant "thinkpractical.com" already exists. Deleting...');
      await Tenant.deleteOne({ domain: 'thinkpractical.com' });
      console.log('✅ Deleted existing tenant');
    }

    // Prepare tenant data
    const tenantData = {
      name: 'ThinkPractical',
      domain: 'thinkpractical.com',
      logo: 'https://thinkpractical.com/logo.png',
      layoutStyle: null, // Use null instead of 'auto' - will use default/auto behavior
      theme: {
        colors: {
          primary: '#1F2937',
          secondary: '#2563EB',
          text: '#111827',
          background: '#FFFFFF',
          accent: '#F59E0B'
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          headingFont: 'Arial, sans-serif',
          fontSize: '16px'
        }
      },
      // Brand Identity
      brandIdentity: {
        brandName: 'ThinkPractical',
        tagline: 'Practical answers for everyday decisions',
        language: 'en',
        country: 'Global',
        region: '',
        tone: 'practical' // Using 'practical' as primary tone (model expects single enum value)
      },
      // Navigation
      navigation: [
        { 
          label: 'Everyday Life', 
          path: '/everyday-life', 
          categoryKey: 'everyday-life', 
          icon: '', 
          order: 0 
        },
        { 
          label: 'Home & Living', 
          path: '/home-living', 
          categoryKey: 'home-living', 
          icon: '', 
          order: 1 
        },
        { 
          label: 'Money & Decisions', 
          path: '/money-decisions', 
          categoryKey: 'money-decisions', 
          icon: '', 
          order: 2 
        },
        { 
          label: 'Health & Habits', 
          path: '/health-habits', 
          categoryKey: 'health-habits', 
          icon: '', 
          order: 3 
        },
        { 
          label: 'How It Works', 
          path: '/how-it-works', 
          categoryKey: 'how-it-works', 
          icon: '', 
          order: 4 
        }
      ],
      // Content Pillars
      contentPillars: [
        {
          categoryKey: 'everyday-life',
          description: 'Practical guidance for everyday habits, routines, and common life decisions.',
          seedKeywords: [
            'daily habits',
            'time management tips',
            'practical routines',
            'life decisions',
            'productivity without stress',
            'simple living tips',
            'daily problems solutions',
            'routine management',
            'work life balance tips',
            'practical life advice'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'home-living',
          description: 'Smart and practical advice for home maintenance, appliances, energy use, and daily living.',
          seedKeywords: [
            'home maintenance tips',
            'appliance care guide',
            'energy saving at home',
            'inverter vs normal appliances',
            'home safety basics',
            'plumbing basics',
            'electrical safety home',
            'household cost reduction',
            'smart home decisions'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'money-decisions',
          description: 'Everyday money decisions explained clearly without investment or legal advice.',
          seedKeywords: [
            'budgeting basics',
            'spending decisions',
            'rent vs buy',
            'saving money habits',
            'monthly expense planning',
            'subscription costs',
            'financial habits',
            'everyday money management',
            'cost comparison tips'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 2
        },
        {
          categoryKey: 'health-habits',
          description: 'Lifestyle health and daily habits focused on wellbeing without medical advice.',
          seedKeywords: [
            'healthy daily habits',
            'sleep improvement tips',
            'walking benefits',
            'morning routines health',
            'eating habits basics',
            'lifestyle wellness tips',
            'daily energy improvement',
            'non medical health tips'
          ],
          monetizationMode: 'adsense',
          postingRatePerWeek: 1
        },
        {
          categoryKey: 'how-it-works',
          description: 'Simple explanations of how everyday objects, systems, and technologies work.',
          seedKeywords: [
            'how things work',
            'everyday science explained',
            'appliance working principle',
            'technology basics explained',
            'how devices work',
            'common myths explained',
            'simple explanations'
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
      // Analytics (optional, can be set later)
      googleAnalyticsId: '',
      adsenseId: '',
      googleSearchConsoleVerified: false
    };

    // Create tenant
    const tenant = new Tenant(tenantData);
    await tenant.save();

    console.log('✅ ThinkPractical tenant created successfully!');
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
seedThinkPractical();

