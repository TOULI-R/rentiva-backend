require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const User = require(path.join(process.cwd(), 'models', 'User.js'));
const Landlord = require(path.join(process.cwd(), 'models', 'Landlord.js'));

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    let u = await User.findOne({}, '_id');
    if (!u) u = await Landlord.findOne({}, '_id');
    if (!u) {
      console.error('NO_USER_OR_LANDLORD');
      process.exit(2);
    }
    console.log(u._id.toString());
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
