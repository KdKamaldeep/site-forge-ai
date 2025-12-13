import mongoose from 'mongoose';

const pageSearchMetricsWeeklySchema = new mongoose.Schema({
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
  pageSlug: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  weekStartDate: {
    type: Date,
    required: true,
    index: true
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  ctr: {
    type: Number,
    default: 0 // Click-through rate (clicks/impressions)
  },
  avgPosition: {
    type: Number,
    default: null // Average position in search results
  },
  topQueries: [{
    query: { type: String, required: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    avgPosition: { type: Number, default: null }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
pageSearchMetricsWeeklySchema.index({ tenantId: 1, weekStartDate: 1 });
pageSearchMetricsWeeklySchema.index({ tenantId: 1, pageId: 1, weekStartDate: 1 });
pageSearchMetricsWeeklySchema.index({ tenantId: 1, pageSlug: 1, weekStartDate: 1 });

// Ensure unique combination of tenant, page, and week
pageSearchMetricsWeeklySchema.index(
  { tenantId: 1, pageId: 1, weekStartDate: 1 },
  { unique: true }
);

export default mongoose.model('PageSearchMetricsWeekly', pageSearchMetricsWeeklySchema);

