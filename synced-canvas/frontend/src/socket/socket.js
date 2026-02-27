import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("token") || "",
  }
});

// Connection and error event listeners
socket.on("connect", () => {
  console.log("✓ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("✗ Socket disconnected:", reason);
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error);
});