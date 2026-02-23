import mongoose from "mongoose";

export const connectDB = async () => {
  try { 
    console.log("Connecting to MongoDB...", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌", error);
    process.exit(1); // optional: exit process if DB connection fails
  }
};