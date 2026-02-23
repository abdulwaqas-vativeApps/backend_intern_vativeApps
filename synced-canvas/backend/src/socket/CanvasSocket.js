import Stroke from "../models/Stroke.js";

export default function canvasSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ---------------------------
    // Join Room + Send History
    // ---------------------------
    socket.on("joinRoom", async (roomId) => {
      socket.join(roomId);

      const strokes = await Stroke.find({
        roomId,
        isDeleted: false,
      });

      socket.emit("roomHistory", strokes);

      console.log(`${socket.id} joined ${roomId}`);
    });

    // ---------------------------
    // Leave Room
    // ---------------------------
    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
      console.log(`${socket.id} left ${roomId}`);
    });

    // ---------------------------
    // Stroke Start (realtime only)
    // ---------------------------
    socket.on("strokeStart", ({ roomId, userId, strokeId, point }) => {
      socket.to(roomId).emit("strokeStart", {
        userId,
        strokeId,
        point,
      });
    });

    // ---------------------------
    // Stroke Streaming Points
    // ---------------------------
    socket.on(
      "strokePoint",
      ({ roomId, userId, strokeId, point, color, brushSize }) => {
        socket.to(roomId).emit("strokePoint", {
          userId,
          strokeId,
          point,
          color,
          brushSize,
        });
      },
    );

    // ---------------------------
    // Stroke End → SAVE IN DB
    // ---------------------------
    socket.on(
      "strokeEnd",
      async ({ roomId, userId, strokeId, points, color, brushSize }) => {
        const newStroke = await Stroke.create({
          strokeId,
          roomId,
          userId,
          points,
          color,
          width: brushSize,
        });

        io.to(roomId).emit("strokeComplete", newStroke);
      },
    );

    // ---------------------------
    // Undo (Soft Delete)
    // ---------------------------
    socket.on("undo", async ({ roomId, strokeId }) => {
      await Stroke.updateOne({ strokeId }, { isDeleted: true });

      io.to(roomId).emit("undo", { strokeId });
    });

    // ---------------------------
    // Redo (Restore Last Deleted Stroke of User)
    // ---------------------------
    socket.on("redo", async ({ roomId, userId }) => {
      const lastDeleted = await Stroke.findOne({
        roomId,
        userId,
        isDeleted: true,
      }).sort({ updatedAt: -1 });

      if (!lastDeleted) return;

      lastDeleted.isDeleted = false;
      await lastDeleted.save();

      io.to(roomId).emit("strokeComplete", lastDeleted);
    });

    // ---------------------------
    // Clear (Soft Delete All)
    // ---------------------------
    socket.on("clear", async ({ roomId }) => {
      await Stroke.updateMany({ roomId }, { isDeleted: true });

      io.to(roomId).emit("clear");
    });

    // ---------------------------
    // Disconnect
    // ---------------------------
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
