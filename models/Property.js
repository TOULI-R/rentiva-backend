// models/Property.js
const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Landlord',
      required: false,
      index: true,
    },

      // public share link key (for anonymous compatibility checks)
      shareKey: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        index: true,
      },


    // βασικά στοιχεία
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

    // βασικό πεδίο: τετραγωνικά
    size: {
      type: Number,
      required: false,
      min: 0,
      index: true,
    },

    // όροφος
    floor: {
      type: Number,
      required: false,
      min: -5, // μέχρι και υπόγειο
      index: true,
    },

    // υπνοδωμάτια
    bedrooms: {
      type: Number,
      required: false,
      min: 0,
      index: true,
    },

    // μπάνια / WC
    bathrooms: {
      type: Number,
      required: false,
      min: 0,
      index: true,
    },

    // ---- ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ ΚΤΙΡΙΟΥ ----
    yearBuilt: {
      type: Number,
      required: false,
      min: 1800,
      index: true,
    },
    yearRenovated: {
      type: Number,
      required: false,
      min: 1800,
    },
    heatingType: {
      type: String,
      enum: [
        'none',           // χωρίς θέρμανση
        'central_oil',    // κεντρική πετρέλαιο
        'central_gas',    // κεντρική φυσικό αέριο
        'autonomous_gas', // ατομική φυσικό αέριο
        'autonomous_oil', // ατομική πετρέλαιο
        'heat_pump',      // αντλία θερμότητας
        'electric',       // ηλεκτρικά σώματα / a/c
        'other',
      ],
      default: 'none',
      index: true,
    },
    energyClass: {
      type: String,
      enum: [
        'unknown',
        'A+',
        'A',
        'B+',
        'B',
        'C',
        'D',
        'E',
        'Z',
        'H',
      ],
      default: 'unknown',
      index: true,
    },
    parking: {
      type: String,
      enum: [
        'none',
        'street',  // στάθμευση στο δρόμο
        'open',    // πυλωτή / ανοιχτός χώρος
        'closed',  // κλειστός χώρος
        'garage',  // ιδιωτικό γκαράζ
      ],
      default: 'none',
      index: true,
    },
    elevator: {
      type: Boolean,
      required: false,
      default: false,
    },

    // επιπλωμένο
    furnished: {
      type: String,
      enum: ['none', 'partial', 'full'],
      default: 'none',
      index: true,
    },

    // επιτρέπονται κατοικίδια
    petsAllowed: {
      type: Boolean,
      required: false,
      default: false,
    },

    tenantPrefs: {
      // Smoking preference
      smoking: { type: String, enum: ["no", "yes", "either"], default: "either" },

      // Pets policy (at the preference layer)
      pets: { type: String, enum: ["no", "yes", "either"], default: "either" },

      // Intended usage / household type
      usage: {
        type: [String],
        enum: ["remote_work", "family", "students", "single", "couple", "shared"],
        default: [],
      },

      // Quiet hours (e.g. after 23:00)
      quietHoursAfter: { type: Number, min: 0, max: 23, default: null },
      quietHoursStrict: { type: Boolean, default: false },

      // Extra: max occupants preference (optional)
      maxOccupants: { type: Number, min: 1, max: 20, default: null },

      updatedAt: { type: Date, default: null },
    },


    // αναλυτική περιγραφή
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2000,
    },

    // ---- ΟΙΚΟΝΟΜΙΚΑ ΠΕΔΙΑ RENTIVA ----
    // μέσος μηνιαίος λογαριασμός κοινόχρηστων
    commonCharges: {
      type: Number,
      required: false,
      min: 0,
    },

    // άλλα σταθερά μηνιαία έξοδα (π.χ. parking, αποθήκη)
    otherFixedCosts: {
      type: Number,
      required: false,
      min: 0,
    },

    // περιλαμβάνονται λογαριασμοί (ρεύμα/νερό/θέρμανση κ.λπ.)
    billsIncluded: {
      type: Boolean,
      required: false,
      default: false,
    },

    // πόσους μήνες εγγύηση ζητάει ο ιδιοκτήτης
    depositMonths: {
      type: Number,
      required: false,
      min: 0,
    },

    // ελάχιστη διάρκεια μίσθωσης σε μήνες
    minimumContractMonths: {
      type: Number,
      required: false,
      min: 0,
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
