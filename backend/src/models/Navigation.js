import mongoose from 'mongoose';

const navigationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    unique: true,
    index: true
  },
  logo: {
    type: String,
    default: null,
    trim: true
  },
  menu: [{
    label: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }
  }],
  cta: {
    label: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    }
  },
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

export default mongoose.model('Navigation', navigationSchema);

