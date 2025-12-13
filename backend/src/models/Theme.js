import mongoose from 'mongoose';

const themeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  components: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  styles: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.model('Theme', themeSchema);

