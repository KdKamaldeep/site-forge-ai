import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  meta: {
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    keywords: {
      type: [String],
      default: []
    },
    ogImage: {
      type: String,
      trim: true,
      default: null
    },
    // E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
    author: {
      name: { type: String, trim: true, default: null },
      bio: { type: String, trim: true, default: null },
      expertise: { type: [String], default: [] }
    },
    citations: {
      type: [String], // URLs to sources/citations
      default: []
    },
    lastReviewed: {
      type: Date,
      default: null
    }
  },
  isHome: {
    type: Boolean,
    default: false,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  uxLayout: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      layout: 'StandardArticle',
      sections: []
    }
  },
  // SEO & Performance
  schemaMarkup: {
    type: mongoose.Schema.Types.Mixed, // JSON-LD structured data
    default: null
  },
  readingTime: {
    type: Number, // Estimated reading time in minutes
    default: null
  },
  wordCount: {
    type: Number,
    default: 0
  },
  // AdSense optimization
  adZones: {
    type: [String], // ['above-content', 'mid-content', 'below-content', 'sidebar']
    default: []
  },
  // Quality metrics
  qualityScore: {
    type: Number, // 0-100 quality score
    default: null
  },
  // Monetization
  intent: {
    type: String,
    enum: ['informational', 'commercial', 'lead'],
    default: 'informational'
  },
  monetizationMode: {
    type: String,
    enum: ['adsense', 'affiliate', 'lead', 'mixed'],
    default: 'adsense'
  },
  // Pillar-based generation fields
  categoryKey: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  primaryKeyword: {
    type: String,
    trim: true,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for tenant + slug uniqueness
pageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export default mongoose.model('Page', pageSchema);

