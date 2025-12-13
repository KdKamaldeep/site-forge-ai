import mongoose from 'mongoose';

const aiAuditSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    default: null
  },
  service: {
    type: String,
    required: true,
    enum: ['openai', 'gemini', 'unsplash', 'other'],
    index: true
  },
  operation: {
    type: String,
    required: true,
    trim: true
    // e.g., 'generateContent', 'generateImage', 'extractImagePrompts', etc.
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failed', 'partial'],
    index: true
  },
  error: {
    type: String,
    trim: true,
    default: null
  },
  errorStack: {
    type: String,
    default: null
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Store relevant request data (prompt, model, etc.)
  },
  responseData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Store relevant response data (tokens used, cost estimate, etc.)
  },
  duration: {
    type: Number,
    default: null
    // Duration in milliseconds
  },
  tokensUsed: {
    type: Number,
    default: null
  },
  estimatedCost: {
    type: Number,
    default: null
    // Estimated cost in USD
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Additional metadata (pageId, topic, etc.)
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
aiAuditSchema.index({ tenantId: 1, createdAt: -1 });
aiAuditSchema.index({ service: 1, status: 1, createdAt: -1 });
aiAuditSchema.index({ operation: 1, createdAt: -1 });

export default mongoose.model('AIAudit', aiAuditSchema);

