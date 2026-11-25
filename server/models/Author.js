const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },
    biography: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

authorSchema.index({ name: 1 });

module.exports = mongoose.model('Author', authorSchema);
