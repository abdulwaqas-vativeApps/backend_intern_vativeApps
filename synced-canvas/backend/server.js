import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";     
import canvasSocket from "./src/socket/CanvasSocket.js";
import userRoutes from "./src/routes/UserRoutes.js";
import { globalErrorHandler } from "./src/middleware/GlobalError.js";
import roomRoutes from "./src/routes/RoomRoutes.js";
import { ApiError } from "./src/utils/ApiError.js";
import User from "./src/models/User.js";
import jwt from "jsonwebtoken";

dotenv.config();
await connectDB();

const app = express();
const server = http.createServer(app);


// ---------------------------
// Socket.io setup with JWT authentication
// ---------------------------
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) throw new ApiError(401, "No token provided");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new ApiError(401, "User not found");

    socket.user = user;

    next();
  } catch (err) {
    next(err || new ApiError(401, "Not authorized"));
  }
});

canvasSocket(io);

app.use(cors(
  {
    origin: "http://localhost:5173", // Adjust as needed
    // methods: ["GET", "POST"],
    // allowedHeaders: ["Content-Type", "Authorization"],
  }
));
app.use(express.json());

// ---------------------------
// Routes
// ---------------------------
app.use("/api/auth", userRoutes);
app.use("/api/rooms", roomRoutes);

// ---------------------------
// Route not found Handler
// ---------------------------
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found")); 
});

app.use(globalErrorHandler);

server.listen(process.env.PORT || 5000, () =>
  console.log("Server running on port", process.env.PORT || 5000),
);