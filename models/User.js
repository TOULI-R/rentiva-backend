// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// Αποφυγή OverwriteModelError σε nodemon
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
