// models/TenantProfile.js
const mongoose = require("mongoose");

const tenantAnswersSchema = new mongoose.Schema(
  {
    smoking: { type: String, enum: ["yes", "no"], required: false },
    pets: { type: String, enum: ["yes", "no"], required: false },
    usage: { type: [String], default: [] },
    quietHoursAfter: { type: Number, min: 0, max: 23, required: false },
    occupants: { type: Number, min: 1, max: 20, required: false },
  },
  { _id: false, versionKey: false }
);

const tenantProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Basic contact / info (v1)
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    about: { type: String, trim: true },

    // “Tenant Passport” answers (v1) – reusable for internal tests & future “Apply with Passport”
    tenantAnswers: { type: tenantAnswersSchema, default: {} },
  },
  { timestamps: true, versionKey: false }
);

module.exports =
  mongoose.models.TenantProfile ||
  mongoose.model("TenantProfile", tenantProfileSchema);
