const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: [true, 'Author reference is required']
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    quantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer'
      }
    },
    availableCopies: {
      type: Number,
      required: [true, 'Available copies is required'],
      min: [0, 'Available copies cannot be negative'],
      validate: {
        validator: function(val) {
          if (!Number.isInteger(val)) return false;
          return val <= this.quantity;
        },
        message: 'Available copies must be an integer between 0 and total quantity'
      }
    }
  },
  {
    timestamps: true
  }
);

bookSchema.index({ title: 'text', category: 'text' });
bookSchema.index({ authorId: 1 });

module.exports = mongoose.model('Book', bookSchema);
