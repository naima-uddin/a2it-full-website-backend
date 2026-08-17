const mongoose = require("mongoose");
const { ensureSrvResolution } = require("./dns");

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb+srv://naimaa2it_db_user:LseCFqfqltKY58GW@cluster0.g3sv2kc.mongodb.net/a2it-database?appName=Cluster0";

    await ensureSrvResolution(mongoUri);

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true, //এগুলো মূলত mongoose.connect() এর old configuration options ছিল যেগুলো MongoDB driver এর কিছু পুরোনো warning avoid করতে use করা হতো। তবে এখন MongoDB driver এর নতুন version এ এগুলো default ভাবে enable করা হয়েছে, তাই এই options গুলো দেওয়া না দিলেও কাজ করবে। তবে compatibility এর জন্য অনেক প্রজেক্টে এখনো দেওয়া হয়।
    });

    console.log("✅ MongoDB connected successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
