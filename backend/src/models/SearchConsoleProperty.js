import mongoose from 'mongoose';

const searchConsolePropertySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  siteUrl: {
    type: String,
    required: true,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String,
    required: true,
    trim: true
    // Note: In production, encrypt this field
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure one property per tenant
searchConsolePropertySchema.index({ tenantId: 1 }, { unique: true });

export default mongoose.model('SearchConsoleProperty', searchConsolePropertySchema);

