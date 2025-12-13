/**
 * Auto-Run Publisher Script
 * 
 * Automatically triggers MicrositeBuilderAgent on a schedule to publish new pages for each tenant.
 * Runs every 48 hours using node-cron.
 * 
 * Usage:
 *   node scripts/auto-run-publisher.js
 * 
 * Environment Variables Required:
 *   MONGODB_URI
 *   OPENAI_API_KEY
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Note: node-cron needs to be installed: npm install node-cron
// Using require for node-cron as it's CommonJS
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cron = require('node-cron');

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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/microsite-empire';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
}

/**
 * Infer niche from tenant name or domain
 */
function inferNiche(tenant) {
  const name = tenant.name.toLowerCase();
  const domain = tenant.domain.toLowerCase();
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
 * Generate 1-3 unique, SEO-relevant topics for a niche using OpenAI
 */
async function generateTopics(niche) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const numTopics = Math.floor(Math.random() * 3) + 1; // 1-3 topics

    const prompt = `Generate ${numTopics} unique, SEO-relevant topic ideas for a ${niche} website. 
Each topic should be:
- Specific and niche-focused
- SEO-friendly (searchable keywords)
- Content-worthy (can be expanded into a full article)
- Unique and not generic

Return ONLY a JSON array of topic strings, nothing else. Example format:
["Topic 1", "Topic 2", "Topic 3"]

Topics for ${niche} niche:`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || process.env.GPT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content strategist that generates SEO-optimized topic ideas. Return only valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    
    // Try to parse JSON from response
    let topics = [];
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      topics = JSON.parse(cleaned);
      
      if (!Array.isArray(topics)) {
        throw new Error('Response is not an array');
      }
      
      // Ensure we have 1-3 topics
      topics = topics.slice(0, 3).filter(t => t && typeof t === 'string' && t.trim().length > 0);
      
      if (topics.length === 0) {
        throw new Error('No valid topics generated');
      }
    } catch (parseError) {
      // Fallback: try to extract topics from text
      console.warn('⚠️  Failed to parse JSON, attempting text extraction...');
      const lines = content.split('\n').filter(line => line.trim());
      topics = lines
        .map(line => {
          // Remove numbering, bullets, quotes
          return line.replace(/^[\d\-•\*\s"]+/, '').replace(/["']/g, '').trim();
        })
        .filter(line => line.length > 5 && line.length < 100)
        .slice(0, 3);
      
      if (topics.length === 0) {
        // Ultimate fallback: generate generic topics
        topics = [
          `${niche.charAt(0).toUpperCase() + niche.slice(1)} Guide`,
          `Best ${niche} Tips`,
          `${niche.charAt(0).toUpperCase() + niche.slice(1)} Resources`
        ].slice(0, numTopics);
      }
    }

    return topics;
  } catch (error) {
    console.error('❌ Error generating topics with OpenAI:', error.message);
    
    // Fallback: generate generic topics based on niche
    const fallbackTopics = [
      `${niche.charAt(0).toUpperCase() + niche.slice(1)} Guide`,
      `Best ${niche} Tips`,
      `${niche.charAt(0).toUpperCase() + niche.slice(1)} Resources`
    ];
    
    const numTopics = Math.floor(Math.random() * 3) + 1;
    return fallbackTopics.slice(0, numTopics);
  }
}

/**
 * Random delay between 0-30 minutes (in milliseconds)
 */
function getRandomDelay() {
  const minutes = Math.floor(Math.random() * 31); // 0-30 minutes
  return minutes * 60 * 1000; // Convert to milliseconds
}

/**
 * Process a single tenant
 */
async function processTenant(tenant) {
  const tenantId = tenant._id.toString();
  const niche = inferNiche(tenant);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏢 Processing Tenant: ${tenant.name} (${tenant.domain})`);
  console.log(`📌 Inferred Niche: ${niche}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Generate topics
    console.log('🤖 Generating topics with OpenAI...');
    const topics = await generateTopics(niche);
    console.log(`✅ Generated ${topics.length} topic(s):`);
    topics.forEach((topic, index) => {
      console.log(`   ${index + 1}. ${topic}`);
    });

    // Run the agent
    console.log('\n🤖 Starting Microsite Builder Agent...');
    const startTime = Date.now();
    const results = await MicrositeBuilderAgent.buildMicrosite(tenantId, topics);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Log results
    const createdCount = results.pages.filter(p => p.action === 'created').length;
    const updatedCount = results.pages.filter(p => p.action === 'updated').length;

    console.log(`\n✅ Agent Execution Complete for ${tenant.name}`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📄 Pages Processed: ${results.pages.length} (${createdCount} created, ${updatedCount} updated)`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.pages.length > 0) {
      console.log('\n📄 Pages:');
      results.pages.forEach((page, index) => {
        const action = page.action === 'created' ? '✨' : '🔄';
        console.log(`   ${action} ${page.title} (slug: /${page.slug})`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.topic || error.step}: ${error.error}`);
      });
    }

    return {
      tenant: tenant.name,
      domain: tenant.domain,
      topics,
      pagesCreated: createdCount,
      pagesUpdated: updatedCount,
      totalPages: results.pages.length,
      errors: results.errors.length,
      duration: parseFloat(duration)
    };
  } catch (error) {
    console.error(`❌ Error processing tenant ${tenant.name}:`, error.message);
    console.error(error.stack);
    return {
      tenant: tenant.name,
      domain: tenant.domain,
      error: error.message
    };
  }
}

/**
 * Main publishing function
 */
async function runPublishingCycle() {
  const cycleStartTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AUTO-PUBLISHER CYCLE STARTED');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  let dbConnected = false;

  try {
    // Validate environment
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set in environment variables');
      console.error('   Please set it in your .env file');
      return;
    }

    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ Connected to MongoDB\n');

    // Load all tenants
    console.log('📋 Loading tenants from database...');
    const tenants = await TenantService.listTenants();
    
    if (tenants.length === 0) {
      console.log('⚠️  No tenants found in database. Exiting.');
      return;
    }

    console.log(`✅ Found ${tenants.length} tenant(s)\n`);

    // Process each tenant with random delays
    const results = [];
    
    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];
      
      // Add random delay (except for first tenant)
      if (i > 0) {
        const delayMinutes = Math.floor(getRandomDelay() / 60000);
        console.log(`⏳ Waiting ${delayMinutes} minutes before processing next tenant...\n`);
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      }

      const result = await processTenant(tenant);
      results.push(result);
    }

    // Summary
    const cycleDuration = ((Date.now() - cycleStartTime) / 1000 / 60).toFixed(2);
    const totalCreated = results.reduce((sum, r) => sum + (r.pagesCreated || 0), 0);
    const totalUpdated = results.reduce((sum, r) => sum + (r.pagesUpdated || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 PUBLISHING CYCLE SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${cycleDuration} minutes`);
    console.log(`🏢 Tenants Processed: ${results.length}`);
    console.log(`✨ Pages Created: ${totalCreated}`);
    console.log(`🔄 Pages Updated: ${totalUpdated}`);
    console.log(`📄 Total Pages: ${totalCreated + totalUpdated}`);
    console.log(`❌ Total Errors: ${totalErrors}`);
    console.log('='.repeat(60));

    if (results.some(r => r.error)) {
      console.log('\n⚠️  Some tenants had errors:');
      results.filter(r => r.error).forEach(r => {
        console.log(`   ❌ ${r.tenant}: ${r.error}`);
      });
    }

    console.log('\n✅ Publishing cycle completed successfully!');
    console.log(`📅 Next run scheduled for: ${new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()}\n`);

  } catch (error) {
    console.error('❌ Error in publishing cycle:', error);
    console.error(error.stack);
  } finally {
    // Close MongoDB connection
    if (dbConnected) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

/**
 * Schedule the publishing cycle
 * Runs every 48 hours (every 2 days at midnight)
 */
function startScheduler() {
  console.log('⏰ Auto-Publisher Scheduler Starting...');
  console.log('📅 Schedule: Every 48 hours (every 2 days at 00:00)');
  console.log('🔧 Cron Expression: 0 0 */2 * *');
  console.log('');

  // Schedule: Run every 2 days at midnight (0 0 */2 * *)
  // Alternative: Run every 48 hours (0 */48 * * *) - but this is less predictable
  cron.schedule('0 0 */2 * *', async () => {
    await runPublishingCycle();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Also run immediately on startup (optional - comment out if you don't want this)
  console.log('🚀 Running initial publishing cycle...\n');
  runPublishingCycle().catch(error => {
    console.error('❌ Error in initial publishing cycle:', error);
  });

  console.log('✅ Scheduler started. Script will continue running...');
  console.log('💡 Press Ctrl+C to stop\n');
}

// Start the scheduler (this script is meant to run standalone)
startScheduler();

// Keep the process alive
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down auto-publisher...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  console.log('✅ Shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down auto-publisher...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  console.log('✅ Shutdown complete');
  process.exit(0);
});

export { runPublishingCycle, generateTopics, inferNiche };

