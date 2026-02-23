import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import canvasSocket from "./src/socket/CanvasSocket.js";
import userRoutes from "./src/routes/userRoutes.js";

dotenv.config();
await connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

canvasSocket(io);

app.use(express.json());

// ---------------------------
// Routes
// ---------------------------

app.use("/api/auth", userRoutes);

app.use((err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  console.error(err);
  return res.status(500).json({ success: false, message: "Internal Server Error" });
});

server.listen(5000, () =>
  console.log("Server running on 5000")
);