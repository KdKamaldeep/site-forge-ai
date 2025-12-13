import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin'
  }
}, {
  timestamps: true
});

// Hash password before saving
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
adminUserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('AdminUser', adminUserSchema);

