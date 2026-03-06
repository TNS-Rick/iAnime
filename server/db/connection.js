const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/ianime';
    
    await mongoose.connect(MONGODB_URI);

    console.log('✅ MongoDB connesso con successo');
    return true;
  } catch (error) {
    console.error('❌ Errore connessione MongoDB:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnesso');
  } catch (error) {
    console.error('❌ Errore disconnessione MongoDB:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
