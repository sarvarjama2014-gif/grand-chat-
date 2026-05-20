const mongoose = require('mongoose');

const connectDB = async (retries = 10, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1}/${retries}: ${error.message}`);
      if (i < retries - 1) {
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error('All retries exhausted. Exiting.');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
