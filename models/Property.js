// models/Property.js
const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true, index: true },
    title:      { type: String, required: true, trim: true, maxlength: 100 },
    address:    { type: String, required: true, trim: true, maxlength: 200 },
    rent:       { type: Number, required: true, min: 0 },

    status:     { type: String, enum: ['available', 'rented', 'maintenance'], default: 'available', index: true },

    // --- soft delete ---
    isDeleted:  { type: Boolean, default: false, index: true },
    deletedAt:  { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Property', PropertySchema);
