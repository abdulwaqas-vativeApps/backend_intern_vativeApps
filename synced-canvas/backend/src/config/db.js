// import mongoose from "mongoose";
// // mongodb+srv://<db_username>:<db_password>@waqasvativeapps.ywcjplt.mongodb.net/
// const uri =
//   "mongodb+srv://abdulwaqas_db_user:WaqasVativeApps@waqasvativeapps.ywcjplt.mongodb.net";
// // mongodb+srv://<db_username>:<db_password>@waqasvativeapps.ywcjplt.mongodb.net/?appName=WaqasVativeApps
// export const connectDB = async () => {
//   try {
//     console.log("Connecting to MongoDB...", process.env.MONGO_URI);
//     await mongoose.connect(uri);
//     console.log("MongoDB Connected ✅");
//   } catch (error) {
//     console.error("MongoDB connection failed ❌", error); 
//     process.exit(1); // optional: exit process if DB connection fails
//   }
// };


// import mongoose from "mongoose";
import dns from "dns";
import mongoose from "mongoose";

// Set custom DNS servers
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); // Example: Google DNS

const uri =
  "mongodb+srv://abdulwaqas_db_user:WaqasVativeApps@waqasvativeapps.ywcjplt.mongodb.net";

export const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...", uri);

    await mongoose.connect(uri);

    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌", error);
    process.exit(1); // optional: exit process if DB connection fails
  }
};
