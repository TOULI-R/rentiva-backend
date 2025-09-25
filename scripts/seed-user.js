// scripts/seed-user.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// robust import ώστε να μην κολλάει με working dir
const User = require(path.resolve(__dirname, '../models/User.js'));

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'ELENT@email.com';
    const plain = '1234_password';

    let u = await User.findOne({ email });

    if (!u) {
      const passwordHash = await bcrypt.hash(plain, 10);
      u = await User.create({ name: 'Eleni', email, passwordHash });
      console.log('Seeded user:', u._id.toString(), u.email);
    } else {
      if (!u.passwordHash) {
        u.passwordHash = await bcrypt.hash(plain, 10);
        await u.save();
        console.log('Updated existing user with passwordHash:', u._id.toString());
      } else {
        console.log('User already ok:', u._id.toString(), u.email);
      }
    }
  } catch (e) {
    console.error('Seed error:', e.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
