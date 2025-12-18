/**
 * Seed script for HealthyBeeClub tenant
 * Creates a tenant with complete Site DNA configuration
 *
 * Usage: node scripts/seed-HealthyBeeClub.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from '../src/models/Tenant.js';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

async function seedHealthyBeeClub() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const DOMAIN = 'healthybeeclub.com';

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({ domain: DOMAIN });
    const isUpdate = !!existingTenant;

    const tenantData = {
      name: 'HealthyBeeClub',
      domain: DOMAIN,
      logo: ``,
      layoutStyle: null,

      theme: {
        colors: {
          primary: '#0F172A',
          secondary: '#16A34A',
          text: '#0F172A',
          background: '#FFFFFF',
          accent: '#F59E0B'
        },
        typography: {
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          headingFont: 'Poppins, Inter, system-ui, sans-serif',
          fontSize: '16px'
        }
      },

      brandIdentity: {
        brandName: 'Healthy Bee Club',
        tagline: 'Simple habits, healthier days together',
        language: 'en',
        country: 'Global',
        region: '',
        tone: 'supportive'
      },

      contact: {
        supportEmail: 'support@lavanyaverse.com',
        address: 'Model Town',
        createdBy: 'LavanyaVerse.com',
        createdByUrl: 'https://www.lavanyaverse.com/'
      },

      navigation: [
        { label: 'Nutrition', path: '/nutrition', categoryKey: 'nutrition', order: 0 },
        { label: 'Fitness', path: '/fitness', categoryKey: 'fitness', order: 1 },
        { label: 'Sleep & Recovery', path: '/sleep-recovery', categoryKey: 'sleep-recovery', order: 2 },
        { label: 'Mental Wellness', path: '/mental-wellness', categoryKey: 'mental-wellness', order: 3 },
        { label: 'Healthy Habits', path: '/healthy-habits', categoryKey: 'healthy-habits', order: 4 }
      ],

      standalonePages: [
        { pageType: 'privacy-policy', title: 'Privacy Policy', slug: 'privacy-policy', enabled: true },
        { pageType: 'about-us', title: 'About Us', slug: 'about-us', enabled: true },
        { pageType: 'contact', title: 'Contact Us', slug: 'contact', enabled: true },
        {
          pageType: 'cookie-disclosure',
          title: 'Cookie and Advertising Disclosure',
          slug: 'cookie-disclosure',
          enabled: true
        }
      ],

      contentPillars: [
        {
          categoryKey: 'nutrition',
          description: 'Balanced nutrition tips without extreme diets.',
          monetizationMode: 'adsense',
          postingRatePerWeek: 2,
          seedKeywords: [
            'healthy breakfast ideas quick',
            'high protein snacks easy',
            'balanced plate method explained',
            'how to drink more water daily',
            'fiber rich foods list',
            'meal prep for beginners',
            'healthy dinner ideas under 30 minutes',
            'how to reduce sugar cravings',
            'portion control tips for adults',
            'healthy lunch ideas for work',
            'foods that boost metabolism naturally',
            'simple vegetarian protein sources',
            'healthy eating habits for busy people',
            'how to read nutrition labels',
            'low calorie snacks at home',
            'benefits of fruits and vegetables daily',
            'healthy cooking methods explained',
            'how to avoid overeating',
            'nutrition tips for beginners',
            'daily nutrition checklist'
          ]
        },

        {
          categoryKey: 'fitness',
          description: 'Beginner-friendly workouts and movement habits.',
          monetizationMode: 'adsense',
          postingRatePerWeek: 2,
          seedKeywords: [
            'walking plan for beginners 30 days',
            'home workout no equipment beginner',
            'stretching routine for tight hips',
            'how to start strength training at home',
            'daily mobility routine 10 minutes',
            'steps per day benefits',
            'bodyweight exercises for beginners',
            'posture exercises at home',
            'morning exercise routine simple',
            'fitness tips for busy adults',
            'how to stay active without gym',
            'beginner cardio exercises at home',
            'warm up exercises before workout',
            'cool down stretches after workout',
            'how to improve flexibility',
            'low impact exercises for joints',
            'daily fitness habits',
            'how to stay consistent with exercise',
            'simple fitness goals for beginners',
            'exercise routine for healthy lifestyle'
          ]
        },

        {
          categoryKey: 'sleep-recovery',
          description: 'Sleep quality, recovery, and rest routines.',
          monetizationMode: 'adsense',
          postingRatePerWeek: 1,
          seedKeywords: [
            'how to sleep faster at night',
            'sleep hygiene checklist',
            'best bedtime routine for adults',
            'how much sleep do adults need',
            'reduce screen time before bed tips',
            'morning sunlight benefits for sleep',
            'power nap benefits and timing',
            'how to fix sleep schedule naturally',
            'causes of poor sleep habits',
            'foods that help sleep better',
            'evening routine for better sleep',
            'how to wake up refreshed',
            'sleep tips for working professionals',
            'sleep mistakes to avoid',
            'how to reduce nighttime stress',
            'importance of sleep for health',
            'how to improve deep sleep',
            'sleep recovery tips after workout',
            'weekend sleep routine tips',
            'natural ways to improve sleep'
          ]
        },

        {
          categoryKey: 'mental-wellness',
          description: 'Stress management and emotional wellbeing.',
          monetizationMode: 'adsense',
          postingRatePerWeek: 1,
          seedKeywords: [
            'how to reduce stress naturally',
            'simple mindfulness exercises',
            'breathing exercise for anxiety quick',
            'journaling prompts for mental clarity',
            'how to build a self care routine',
            'daily mental wellness habits',
            'how to calm your mind naturally',
            'simple meditation for beginners',
            'how to manage work stress',
            'mental health tips for adults',
            'how to stay positive daily',
            'reduce overthinking techniques',
            'how to practice gratitude daily',
            'mindfulness routine morning',
            'emotional balance tips',
            'how to relax after work',
            'digital detox benefits',
            'ways to improve focus naturally',
            'self care ideas at home',
            'mental wellness checklist'
          ]
        },

        {
          categoryKey: 'healthy-habits',
          description: 'Small daily habits that compound into health.',
          monetizationMode: 'adsense',
          postingRatePerWeek: 2,
          seedKeywords: [
            'healthy habits to start today',
            'how to build habits that stick',
            'morning routine for healthy lifestyle',
            'simple health checklist daily',
            'how to stop late night snacking',
            'reduce caffeine intake tips',
            'how to sit less during workday',
            'daily routine for better health',
            'healthy lifestyle tips for beginners',
            'how to stay consistent with habits',
            'evening routine for health',
            'small habits big health benefits',
            'healthy daily schedule',
            'how to improve lifestyle naturally',
            'time management for healthy living',
            'habit stacking explained',
            'how to break unhealthy habits',
            'daily wellness routine',
            'simple lifestyle changes for health',
            'healthy living checklist'
          ]
        }
      ],

      monetization: {
        primary: 'adsense',
        affiliateProviders: ['amazon'],
        ctaStyle: 'form'
      },

      compliance: {
        forbiddenTopics: [
          'gambling',
          'adult content',
          'illegal activities',
          'medical diagnosis',
          'medical treatment advice',
          'legal advice',
          'cryptocurrency trading',
          'get rich quick schemes'
        ],
        medicalDisclaimer: true,
        legalDisclaimer: true,
        adSenseCompliant: true
      },

      publishingStrategy: {
        pagesPerWeek: 5,
        randomizePublishTime: true,
        autoPublish: true
      },

      googleAnalyticsId: '',
      adsenseId: '',
      googleSearchConsoleVerified: false
    };

    let tenant;
    if (isUpdate) {
      Object.assign(existingTenant, tenantData);
      await existingTenant.save();
      tenant = existingTenant;
      console.log('✅ Updated HealthyBeeClub tenant');
    } else {
      tenant = new Tenant(tenantData);
      await tenant.save();
      console.log('✅ HealthyBeeClub tenant created');
    }

    console.log(`Tenant ID: ${tenant._id}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedHealthyBeeClub();
