// models/PropertyEvent.js
const mongoose = require("mongoose");

const PropertyEventSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    // Phase A kinds (μπορούμε να επεκτείνουμε μετά)
    kind: {
      type: String,
      enum: ["created", "updated", "deleted", "restored", "note"],
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: false, trim: true, maxlength: 2000 },

    // actorId: ποιος το προκάλεσε (user/landlord). Optional.
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    // meta: κρατάμε ελεύθερα extras (π.χ. changes)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

// για γρήγορο timeline ανά ακίνητο
PropertyEventSchema.index({ propertyId: 1, createdAt: -1 });

module.exports = mongoose.model("PropertyEvent", PropertyEventSchema);
