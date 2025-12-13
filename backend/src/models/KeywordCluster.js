import mongoose from 'mongoose';

const keywordClusterSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  categoryKey: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  pillarKeyword: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  supportingTopics: [{
    keyword: { type: String, required: true, trim: true },
    intent: {
      type: String,
      enum: ['informational', 'commercial', 'lead'],
      default: 'informational'
    },
    suggestedSlug: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: ['planned', 'created', 'skipped'],
      default: 'planned'
    },
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
      default: null
    },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
keywordClusterSchema.index({ tenantId: 1, categoryKey: 1, pillarKeyword: 1 }, { unique: true });
keywordClusterSchema.index({ tenantId: 1 });

// Legacy support: supportingKeywords (for backward compatibility)
keywordClusterSchema.virtual('supportingKeywords').get(function() {
  return this.supportingTopics || [];
});

export default mongoose.model('KeywordCluster', keywordClusterSchema);

