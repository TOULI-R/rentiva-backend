require('dotenv').config();
console.log('🔍 MONGO_URI raw:', process.env.MONGO_URI ? '[loaded]' : '[missing]');
const express = require('express');
const cors = require('cors'); 
const mongoose = require('mongoose');

console.log('🔍 MONGO_URI is:', process.env.MONGO_URI ? '[loaded]' : '[missing]');
if (!process.env.MONGO_URI) {
  throw new Error('Το MONGO_URI δεν φορτώθηκε. Έλεγξε το .env');
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Rentiva API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
