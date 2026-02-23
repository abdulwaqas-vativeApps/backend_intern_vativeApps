import Room from "../models/Room.js";
import Stroke from "../models/Stroke.js";

export default function canvasSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ---------------------------
    // Join Room + Send History
    // ---------------------------
    socket.on("joinRoom", async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);

        if (!room) {
          return socket.emit("error", "Room not found");
        }

        const userId = socket.user._id;

        // Check if already member
        const isMember = room.members.some(
          (member) => member.toString() === userId.toString(),
        );

        // Add member if not already in room
        if (!isMember) {
          room.members.push(userId);
          await room.save();
        }

        socket.join(roomId);

        // Notify others
        socket.to(roomId).emit("userJoined", {
          userId,
          username: socket.user.username,
        });

        // Send history
        const strokes = await Stroke.find({
          roomId,
          isDeleted: false,
        });

        socket.emit("roomHistory", strokes);
      } catch (err) {
        socket.emit("error", "Something went wrong");
      }
    });

    // ---------------------------
    // Leave Room
    // ---------------------------
    socket.on("leaveRoom", async (roomId) => {
      const userId = socket.user._id;
      const room = await Room.findById(roomId);

     if (!room) {
        return socket.emit("error", "Room not found");
      }
      // Remove member
      room.members = room.members.filter(
        (member) => member.toString() !== userId.toString(),
      );
      await room.save();

      socket.leave(roomId);

      socket.to(roomId).emit("userLeft", {
        userId: socket.user._id,
        username: socket.user.username,
      });
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
