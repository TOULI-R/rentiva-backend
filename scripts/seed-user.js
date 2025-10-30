require('dotenv').config();
const mongoose = require('mongoose');

// bcrypt ή bcryptjs (ό,τι υπάρχει)
let bcrypt;
try { bcrypt = require('bcrypt'); } catch (e) { bcrypt = require('bcryptjs'); }

async function main() {
  const email = 'eleni@email.com';
  const password = '1234_password';
  const name = 'Eleni';

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI δεν ορίστηκε (.env)');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const conn = mongoose.connection;
  console.log('✅ Συνδέθηκα στη MongoDB:', { db: conn.name });

  // Ελάχιστο schema που ταιριάζει στα περισσότερα setups
  const UserSchema = new mongoose.Schema(
    {
      email: { type: String, index: true, unique: false },
      emailLower: { type: String, index: true },
      name: String,
      passwordHash: String,
      password: String, // για περιπτώσεις που το backend κοιτάει 'password'
      role: { type: String, default: 'user' },
    },
    { collection: 'users', timestamps: true }
  );

  const User = mongoose.model('User', UserSchema);

  const hash = await bcrypt.hash(password, 10);
  const emailLower = email.toLowerCase();

  const res = await User.findOneAndUpdate(
    { emailLower }, // case-insensitive lookup
    {
      $set: {
        email,
        emailLower,
        name,
        passwordHash: hash,
        password: hash, // και εδώ hashed για συμβατότητα
        role: 'user',
      },
    },
    { upsert: true, new: true }
  );

  console.log('✅ Upserted user:', { id: res._id.toString(), email: res.email });
  await mongoose.disconnect();
  console.log('✅ Έγινε!');
}

main().catch((err) => {
  console.error('❌ Σφάλμα:', err);
  process.exit(1);
});
