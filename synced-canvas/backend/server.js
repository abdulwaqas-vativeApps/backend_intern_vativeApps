import express from "express";
import http from "http";
import { Server } from "socket.io"; 
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js"; 
import canvasSocket from "./src/socket/CanvasSocket.js";
import userRoutes from "./src/routes/userRoutes.js";
import { globalErrorHandler } from "./src/middleware/globalError.js";

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

// ---------------------------
// Route not found Handler
// ---------------------------
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});


app.use(globalErrorHandler);

server.listen(5000, () =>
  console.log("Server running on 5000")
);