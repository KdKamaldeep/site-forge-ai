import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  logo: {
    type: String,
    default: null,
    trim: true
  },
  favicon: {
    type: String,
    default: null,
    trim: true
  },
  themeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theme',
    default: null
  },
  theme: {
    colors: {
      primary: { type: String, default: '#007bff' },
      secondary: { type: String, default: '#6c757d' },
      text: { type: String, default: '#212529' },
      background: { type: String, default: '#ffffff' },
      accent: { type: String, default: '#28a745' }
    },
    typography: {
      fontFamily: { type: String, default: 'Arial, sans-serif' },
      headingFont: { type: String, default: 'Arial, sans-serif' },
      fontSize: { type: String, default: '16px' }
    }
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // SEO & Analytics
  googleAnalyticsId: {
    type: String,
    trim: true,
    default: null
  },
  googleSearchConsoleVerified: {
    type: Boolean,
    default: false
  },
  adsenseId: {
    type: String,
    trim: true,
    default: null
  },
  // Layout style assignment (for 10 different styles)
  layoutStyle: {
    type: String,
    enum: ['modernMinimal', 'boldVibrant', 'professionalCorporate', 'magazineStyle', 
           'techModern', 'creativeArtistic', 'ecommerceFocused', 'educational', 
           'newsBlog', 'portfolioShowcase'],
    default: null
  },
  // Topical Authority - Pillar/Cluster structure (legacy, kept for backward compatibility)
  currentPillar: {
    keyword: { type: String, trim: true, default: null },
    createdAt: { type: Date, default: null }
  },
  pillarHistory: [{
    keyword: { type: String, required: true },
    createdAt: { type: Date, required: true },
    retiredAt: { type: Date, required: true }
  }],
  // New Pillar-Based Generation System
  activePillar: {
    categoryKey: { type: String, trim: true, default: null },
    pillarKeyword: { type: String, trim: true, default: null },
    targetSupportingCount: { type: Number, default: 30, min: 10, max: 50 },
    createdAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  pillarHistoryNew: [{
    categoryKey: { type: String, required: true },
    pillarKeyword: { type: String, required: true },
    targetSupportingCount: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    completedAt: { type: Date, default: null }
  }],
  // Site DNA - Explicit brand and content configuration
  brandIdentity: {
    brandName: { type: String, trim: true, default: null },
    tagline: { type: String, trim: true, default: null },
    language: { type: String, default: 'en', enum: ['en', 'hi', 'pa', 'es', 'fr', 'de', 'zh', 'ja', 'other'] },
    country: { type: String, trim: true, default: 'Global' },
    region: { type: String, trim: true, default: null },
    tone: { type: String, default: 'friendly', enum: ['practical', 'friendly', 'expert', 'professional', 'casual', 'authoritative', 'conversational','supportive'] }
  },
  // Navigation structure (explicit, not AI-generated)
  navigation: [{
    label: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    categoryKey: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: null },
    order: { type: Number, default: 0 }
  }],
  // Content pillars/categories
  contentPillars: [{
    categoryKey: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    seedKeywords: [{ type: String, trim: true }],
    monetizationMode: { type: String, default: 'adsense', enum: ['adsense', 'affiliate', 'lead', 'mixed'] },
    postingRatePerWeek: { type: Number, default: 2, min: 0, max: 10 }
  }],
  // Standalone pages (Privacy Policy, About Us, Contact, Cookie Disclosure)
  standalonePages: [{
    pageType: { type: String, required: true, enum: ['privacy-policy', 'about-us', 'contact', 'cookie-disclosure'] },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    enabled: { type: Boolean, default: true }
  }],
  // Monetization configuration
  monetization: {
    primary: { type: String, default: 'adsense', enum: ['adsense', 'affiliate', 'lead', 'mixed'] },
    affiliateProviders: [{ type: String, trim: true }], // e.g., 'amazon', 'impact', 'cj'
    ctaStyle: { type: String, default: 'form', enum: ['whatsapp', 'form', 'both'] }
  },
  // Compliance and safety rules
  compliance: {
    forbiddenTopics: [{ type: String, trim: true }], // Topics to never write about
    medicalDisclaimer: { type: Boolean, default: true }, // Add medical disclaimer if needed
    legalDisclaimer: { type: Boolean, default: true }, // Add legal disclaimer if needed
    noFakePricing: { type: Boolean, default: true }, // Never use fake prices
    noGuaranteedResults: { type: Boolean, default: true }, // No "guaranteed results" language
    adSenseCompliant: { type: Boolean, default: true } // Ensure AdSense compliance
  },
  // Publishing strategy
  publishingStrategy: {
    pagesPerWeek: { type: Number, default: 2, min: 1, max: 10 },
    randomizePublishTime: { type: Boolean, default: true },
    autoPublish: { type: Boolean, default: false } // Auto-publish or keep as draft
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Tenant', tenantSchema);

