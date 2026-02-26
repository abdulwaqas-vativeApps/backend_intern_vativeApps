// import mongoose from "mongoose";
// export const connectDB = async () => {
//   try {
//     console.log("Connecting to MongoDB...", process.env.MONGO_URI);
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("MongoDB Connected ✅"); 
//   } catch (error) {
//     console.error("MongoDB connection failed ❌", error);
//     process.exit(1); 
//   }
// };

import mongoose from "mongoose";
import dns from "dns";
// Set custom DNS servers
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); // Example: Google DNS

export const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...", process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌", error);
    process.exit(1); 
  }
};
