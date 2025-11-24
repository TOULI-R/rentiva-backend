// models/Property.js
const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Landlord',
      required: false, // δεν είναι πλέον υποχρεωτικό
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    rent: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance'],
      default: 'available',
      index: true,
    },

    // soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// text index για αναζήτηση σε title/address
PropertySchema.index({ title: 'text', address: 'text' });

module.exports = mongoose.model('Property', PropertySchema);
