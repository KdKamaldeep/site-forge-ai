import mongoose from 'mongoose';

const pageVersionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  pageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Page',
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  title: {
    type: String,
    required: true
  },
  meta: {
    title: { type: String },
    description: { type: String },
    keywords: { type: [String], default: [] }
  },
  html: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  aiReason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'rolled_back'],
    default: 'draft'
  },
  optimizationType: {
    type: String,
    enum: ['ctr_improvement', 'content_expansion', 'title_rewrite', 'meta_rewrite', 'internal_links'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
pageVersionSchema.index({ tenantId: 1, pageId: 1, version: 1 }, { unique: true });
pageVersionSchema.index({ tenantId: 1, pageId: 1, status: 1 });

export default mongoose.model('PageVersion', pageVersionSchema);

