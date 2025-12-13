/**
 * Script to run Microsite Builder Agent
 * 
 * Usage:
 *   node scripts/run-agent.js <tenantId> <topic1> <topic2> ...
 *   node scripts/run-agent.js <domain>                    (auto-generates topics)
 * 
 * Example:
 *   node scripts/run-agent.js 507f1f77bcf86cd799439011 "Travel Tips" "Best Destinations" "Travel Guides"
 *   node scripts/run-agent.js travel.ai                    (auto-generates 3-5 topics)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import Tenant from '../src/models/Tenant.js';

// Load environment variables FIRST
dotenv.config();

// Import all models to ensure they're registered with Mongoose BEFORE importing services
// This is critical for populate() to work - models must be registered before any queries
import '../src/models/Tenant.js';
import '../src/models/Page.js';
import '../src/models/Theme.js';
import '../src/models/Navigation.js';
import '../src/models/AdminUser.js';

// Now import services (which may use populate)
import { MicrositeBuilderAgent } from '../src/agents/micrositeBuilderAgent.js';
import { TenantService } from '../src/services/TenantService.js';
import { KeywordClusterService } from '../src/services/KeywordClusterService.js';
import slugify from '../src/utils/slugify.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';

/**
 * Infer niche from tenant name or domain
 */
function inferNiche(tenant) {
  const name = tenant.name?.toLowerCase() || '';
  const domain = tenant.domain?.toLowerCase() || '';
  const combined = `${name} ${domain}`;

  // Common niche keywords
  const niches = {
    'travel': ['travel', 'trip', 'destination', 'vacation', 'tour', 'journey'],
    'health': ['health', 'fitness', 'wellness', 'medical', 'doctor', 'medicine'],
    'tech': ['tech', 'technology', 'software', 'app', 'digital', 'ai', 'code'],
    'finance': ['finance', 'money', 'investment', 'bank', 'crypto', 'trading'],
    'food': ['food', 'recipe', 'cooking', 'restaurant', 'cuisine', 'dining'],
    'education': ['education', 'learn', 'course', 'school', 'university', 'study'],
    'business': ['business', 'company', 'enterprise', 'corporate', 'startup'],
    'lifestyle': ['lifestyle', 'life', 'living', 'home', 'family', 'personal'],
    'sports': ['sport', 'fitness', 'athletic', 'game', 'team', 'player'],
    'entertainment': ['entertainment', 'movie', 'music', 'show', 'game', 'fun']
  };

  for (const [niche, keywords] of Object.entries(niches)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return niche;
    }
  }

  // Default to general/lifestyle if no match
  return 'general';
}

/**
 * Generate 3-5 SEO-friendly topics for a tenant using OpenAI
 */
async function generateTopics(tenant) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  const openai = new OpenAI({ apiKey });
  const niche = inferNiche(tenant);
  const tenantName = tenant.name || tenant.domain || 'this website';
  const numTopics = Math.floor(Math.random() * 3) + 3; // 3-5 topics

  try {
    const prompt = `Generate ${numTopics} unique, SEO-friendly topic ideas for a ${niche} website called "${tenantName}" (domain: ${tenant.domain}).

Each topic should be:
- Specific and niche-focused (${niche} related)
- Long-tail SEO keywords (searchable phrases)
- Human-like and natural (not keyword-stuffed)
- Unique and not generic
- Content-worthy (can be expanded into a comprehensive 2000+ word article)
- SEO-optimized for search engines

Return a JSON object with a "topics" array containing ${numTopics} topic strings. Example format:
{"topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]}

Topics for ${niche} niche website "${tenantName}":`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || process.env.GPT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content strategist that generates SEO-optimized, long-tail topic ideas. Return a JSON object with a "topics" array containing 3-5 topic strings.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content.trim();
    
    // Try to parse JSON from response
    let topics = [];
    try {
      // Handle both JSON object and array formats
      const parsed = JSON.parse(content);
      
      // If it's an object, look for topics array or extract values
      if (Array.isArray(parsed)) {
        topics = parsed;
      } else if (parsed.topics && Array.isArray(parsed.topics)) {
        topics = parsed.topics;
      } else if (parsed.topic && Array.isArray(parsed.topic)) {
        topics = parsed.topic;
      } else {
        // Extract array values from object
        topics = Object.values(parsed).filter(v => typeof v === 'string');
      }
      
      // Ensure we have 3-5 valid topics
      topics = topics
        .filter(t => t && typeof t === 'string' && t.trim().length > 10 && t.trim().length < 100)
        .slice(0, 5);
      
      if (topics.length < 3) {
        throw new Error('Not enough valid topics generated');
      }
    } catch (parseError) {
      // Fallback: try to extract topics from text
      console.warn('⚠️  Failed to parse JSON, attempting text extraction...');
      const lines = content.split('\n').filter(line => line.trim());
      topics = lines
        .map(line => {
          // Remove numbering, bullets, quotes, JSON syntax
          return line
            .replace(/^[\d\-•\*\s"\[\],]+/, '')
            .replace(/["'\[\],]+/g, '')
            .trim();
        })
        .filter(line => line.length > 10 && line.length < 100)
        .slice(0, 5);
      
      if (topics.length < 3) {
        throw new Error('Could not extract enough topics from response');
      }
    }

    return topics;
  } catch (error) {
    console.error('❌ Error generating topics with OpenAI:', error.message);
    
    // Fallback: generate generic topics based on niche
    const fallbackTopics = {
      'travel': [
        `Top Budget Travel Tips for ${new Date().getFullYear()}`,
        `Cheapest Destinations in Asia for Backpackers`,
        `How to Find Affordable Flights Step-by-Step`,
        `Best Travel Insurance Plans Compared`,
        `Essential Packing Tips for Long Trips`
      ],
      'health': [
        `Top Health Tips for ${new Date().getFullYear()}`,
        `Best Natural Remedies for Common Ailments`,
        `How to Start a Healthy Lifestyle Today`,
        `Essential Vitamins and Supplements Guide`,
        `Daily Exercise Routines for Beginners`
      ],
      'tech': [
        `Latest Technology Trends for ${new Date().getFullYear()}`,
        `Best Software Tools for Productivity`,
        `How to Learn Programming Step-by-Step`,
        `Essential Tech Gadgets for Daily Life`,
        `Cybersecurity Tips Everyone Should Know`
      ],
      'finance': [
        `Top Investment Strategies for ${new Date().getFullYear()}`,
        `How to Save Money on a Tight Budget`,
        `Best Credit Cards for Different Needs`,
        `Essential Financial Planning Tips`,
        `Understanding Cryptocurrency for Beginners`
      ],
      'food': [
        `Top Recipe Ideas for ${new Date().getFullYear()}`,
        `Best Cooking Techniques for Beginners`,
        `How to Meal Prep Like a Pro`,
        `Essential Kitchen Tools Every Cook Needs`,
        `Healthy Meal Ideas for Busy Weekdays`
      ],
      'general': [
        `Top Tips for ${tenantName}`,
        `Best Practices and Guidelines`,
        `How to Get Started Step-by-Step`,
        `Essential Resources and Tools`,
        `Complete Guide for Beginners`
      ]
    };

    const fallback = fallbackTopics[niche] || fallbackTopics['general'];
    return fallback.slice(0, numTopics);
  }
}

async function runAgent() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('❌ Usage: node scripts/run-agent.js <tenantId> [topic1] [topic2] ...');
      console.error('   Or: node scripts/run-agent.js <domain> [topic1] [topic2] ...');
      console.error('');
      console.error('Examples:');
      console.error('   node scripts/run-agent.js travel.ai "Travel Tips" "Destinations"');
      console.error('   node scripts/run-agent.js travel.ai                    (auto-generates topics)');
      process.exit(1);
    }

    const tenantIdentifier = args[0];
    const manualTopics = args.slice(1);

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Resolve tenant (by ID, domain, or name) - create if not exists
    let tenantId = tenantIdentifier;
    let tenant = null;

    // Check if it's a domain (contains .)
    if (tenantIdentifier.includes('.')) {
      // It's a domain
      console.log(`🔍 Looking up tenant by domain: ${tenantIdentifier}`);
      tenant = await TenantService.getTenantByDomain(tenantIdentifier);
      if (!tenant) {
        console.log(`⚠️  Tenant not found for domain: ${tenantIdentifier}`);
        console.log(`✨ Creating new tenant with domain: ${tenantIdentifier}`);
        
        // Create tenant with domain as provided
        const tenantName = tenantIdentifier.split('.')[0]; // Use subdomain as name
        tenant = await TenantService.createTenant({
          name: tenantName.charAt(0).toUpperCase() + tenantName.slice(1),
          domain: tenantIdentifier.toLowerCase(),
          theme: {
            colors: {
              primary: '#007bff',
              secondary: '#6c757d',
              text: '#212529',
              background: '#ffffff',
              accent: '#28a745'
            },
            typography: {
              fontFamily: 'Arial, sans-serif',
              headingFont: 'Arial, sans-serif',
              fontSize: '16px'
            }
          }
        });
        console.log(`✅ Created new tenant: ${tenant.name} (${tenant.domain})\n`);
      } else {
        console.log(`✅ Found tenant: ${tenant.name} (${tenant.domain})\n`);
      }
      tenantId = tenant._id.toString();
    } else if (mongoose.Types.ObjectId.isValid(tenantIdentifier)) {
      // It's a valid ObjectId
      console.log(`🔍 Looking up tenant by ID: ${tenantIdentifier}`);
      tenant = await TenantService.getTenantById(tenantIdentifier);
      if (!tenant) {
        console.error(`❌ Tenant not found with ID: ${tenantIdentifier}`);
        process.exit(1);
      }
      console.log(`✅ Found tenant: ${tenant.name} (${tenant.domain})\n`);
    } else {
      // Try to find by name (case-insensitive)
      console.log(`🔍 Looking up tenant by name: ${tenantIdentifier}`);
      tenant = await Tenant.findOne({ 
        name: { $regex: new RegExp(`^${tenantIdentifier}$`, 'i') }
      });
      
      if (!tenant) {
        // Also try domain without dot (in case user typed domain without extension)
        const domainCandidate = slugify(tenantIdentifier).toLowerCase();
        tenant = await Tenant.findOne({ 
          domain: { $regex: new RegExp(`^${domainCandidate}`, 'i') }
        });
      }
      
      if (!tenant) {
        // Create new tenant with generated domain
        console.log(`⚠️  Tenant not found with name: ${tenantIdentifier}`);
        console.log(`✨ Creating new tenant: ${tenantIdentifier}`);
        
        // Generate domain from name
        const generatedDomain = `${slugify(tenantIdentifier).toLowerCase()}.local`;
        
        // Check if domain already exists, if so, add a number
        let finalDomain = generatedDomain;
        let counter = 1;
        while (await Tenant.findOne({ domain: finalDomain })) {
          finalDomain = `${slugify(tenantIdentifier).toLowerCase()}-${counter}.local`;
          counter++;
        }
        
        tenant = await TenantService.createTenant({
          name: tenantIdentifier,
          domain: finalDomain,
          theme: {
            colors: {
              primary: '#007bff',
              secondary: '#6c757d',
              text: '#212529',
              background: '#ffffff',
              accent: '#28a745'
            },
            typography: {
              fontFamily: 'Arial, sans-serif',
              headingFont: 'Arial, sans-serif',
              fontSize: '16px'
            }
          }
        });
        console.log(`✅ Created new tenant: ${tenant.name} (${tenant.domain})\n`);
      } else {
        console.log(`✅ Found tenant: ${tenant.name} (${tenant.domain})\n`);
      }
      tenantId = tenant._id.toString();
    }

    // Check OpenAI API key (required for both manual and auto topics)
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set in environment variables');
      console.error('   Please set it in your .env file');
      process.exit(1);
    }

    // Determine topics: use manual topics if provided, otherwise use cluster-based generation
    let topics = [];
    
    if (manualTopics.length > 0) {
      // Use manually provided topics (bypass cluster system)
      topics = manualTopics;
      console.log('🤖 Starting Microsite Builder Agent...');
      console.log(`📝 Topics to process: ${topics.length} (manual - bypassing cluster system)`);
      topics.forEach((topic, index) => {
        console.log(`   ${index + 1}. ${topic}`);
      });
      console.log('');
    } else {
      // Use content pillars from tenant DNA if available, otherwise fall back to cluster system
      if (tenant.contentPillars && tenant.contentPillars.length > 0) {
        console.log('🧠 Using content pillars from tenant DNA...');
        console.log(`📌 Tenant: ${tenant.name} (${tenant.domain})`);
        console.log('');

        // Select topics from seed keywords based on posting rate
        topics = [];
        for (const pillar of tenant.contentPillars) {
          // Select keywords based on posting rate per week
          const keywordsToUse = pillar.seedKeywords.slice(0, pillar.postingRatePerWeek);
          topics.push(...keywordsToUse);
          console.log(`📂 Category: ${pillar.categoryKey} (${keywordsToUse.length} topics)`);
        }
        
        if (topics.length === 0) {
          console.warn('⚠️  No seed keywords found in content pillars, falling back to cluster system...\n');
          // Fall through to cluster-based generation
        } else {
          console.log(`✅ Selected ${topics.length} topics from content pillars:\n`);
          topics.forEach((topic, i) => {
            console.log(`   ${i + 1}. ${topic}`);
          });
          console.log('');
        }
      }
      
      // Fall back to cluster-based topic generation if no content pillars or no keywords
      if (!topics || topics.length === 0) {
        console.log('🧠 Cluster-based topic generation...');
        console.log(`📌 Tenant: ${tenant.name} (${tenant.domain})`);
        console.log('');

        // Ensure tenant has a pillar
        const cluster = await KeywordClusterService.getCurrentCluster(tenantId);
        const pillarKeyword = cluster.pillarKeyword;
        console.log(`📌 Current Pillar: "${pillarKeyword}"`);

        // Check if we should retire current pillar
        const shouldRetire = await KeywordClusterService.shouldRetirePillar(tenantId);
        if (shouldRetire) {
          console.log('🔄 Pillar complete (20+ supporting pages). Retiring and starting new pillar...');
          const newPillar = await KeywordClusterService.retirePillar(tenantId);
          console.log(`✨ New Pillar: "${newPillar}"`);
        }

        // Get planned supporting keywords (or generate if none)
        let plannedKeywords = await KeywordClusterService.getPlannedKeywords(tenantId, 5);
        
        if (plannedKeywords.length === 0) {
          console.log('📝 No planned keywords. Generating new supporting keywords...');
          const newKeywords = await KeywordClusterService.generateSupportingKeywords(tenantId, 5);
          plannedKeywords = newKeywords.map(k => k.keyword);
          console.log(`✨ Generated ${plannedKeywords.length} supporting keywords`);
        }

        topics = plannedKeywords;
        console.log(`📝 Topics to process: ${topics.length} (from cluster)`);
      } else {
        console.log(`📝 Topics to process: ${topics.length} (from content pillars)`);
      }
      topics.forEach((topic, index) => {
        console.log(`   ${index + 1}. ${topic}`);
      });
      console.log('');
      console.log('🤖 Starting Microsite Builder Agent...');
      console.log('');
    }

    // Run the agent
    const startTime = Date.now();
    const results = await MicrositeBuilderAgent.buildMicrosite(tenantId, topics);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('✅ Agent Execution Complete!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration} seconds`);
    const createdCount = results.pages.filter(p => p.action === 'created').length;
    const updatedCount = results.pages.filter(p => p.action === 'updated').length;
    console.log(`📄 Pages Processed: ${results.pages.length} (${createdCount} created, ${updatedCount} updated)`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('');

    if (results.pages.length > 0) {
      console.log('📄 Pages Processed:');
      const created = results.pages.filter(p => p.action === 'created');
      const updated = results.pages.filter(p => p.action === 'updated');
      
      if (created.length > 0) {
        console.log(`   ✨ Created (${created.length}):`);
        created.forEach((page, index) => {
          console.log(`      ${index + 1}. ${page.title} (slug: /${page.slug})`);
        });
      }
      
      if (updated.length > 0) {
        console.log(`   🔄 Updated (${updated.length}):`);
        updated.forEach((page, index) => {
          console.log(`      ${index + 1}. ${page.title} (slug: /${page.slug})`);
        });
      }
      console.log('');
    }

    if (results.errors.length > 0) {
      console.log('❌ Errors:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.topic || error.step}: ${error.error}`);
      });
      console.log('');
    }

    console.log(`🌐 View pages at: http://${tenant.domain}:3000`);
    console.log('');

    // CLI Summary
    console.log('📊 CLI SUMMARY:');
    console.log(`   Pages Created: ${createdCount}`);
    console.log(`   Pages Updated: ${updatedCount}`);
    console.log(`   Internal Links: Added/refreshed for all pages`);
    const estimatedCost = (createdCount + updatedCount) * 0.002; // Rough estimate: $0.002 per page
    console.log(`   Estimated AI Cost: ~$${estimatedCost.toFixed(2)}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error running agent:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
runAgent()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

