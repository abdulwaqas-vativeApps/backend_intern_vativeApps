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
    // Stroke Start (Emit to others in room)
    // ---------------------------
    socket.on("strokeStart", ({ roomId, point, strokeId }) => {
      // Emit to others in room
      socket
        .to(roomId)
        .emit("strokeStart", { userId: socket.user._id, strokeId, point });
    });

    //----------------------------
    // Stroke Point (Emit to others in room)
    //----------------------------
    socket.on(
      "strokePoint",
      ({ roomId, point, strokeId, color, brushSize }) => {
        socket.to(roomId).emit("strokePoint", {
          userId: socket.user._id,
          strokeId,
          point,
          color,
          brushSize,
        });
      },
    );

    //----------------------------
    // Stroke End (Save to DB and Emit to others in room)
    //----------------------------
    socket.on(
      "strokeEnd",
      async ({ roomId, points, strokeId, color, brushSize }) => {
        const newStroke = await Stroke.create({
          strokeId, // frontend strokeId
          roomId,
          userId: socket.user._id,
          points,
          color,
          width: brushSize,
        });

        // Emit strokeComplete with DB _id + strokeId
        io.to(roomId).emit("strokeComplete", {
          ...newStroke.toObject(),
          strokeId: newStroke.strokeId, // keep frontend strokeId
        });
      },
    );

    // ---------------------------
    // Undo (Soft Delete)
    // ---------------------------
    socket.on("undo", async ({ roomId, strokeId }) => {
      try {
        const stroke = await Stroke.findOne({
          strokeId,
          userId: socket.user._id,
        });
        if (!stroke)
          return socket.emit("error", "Stroke not found or not yours");

        stroke.isDeleted = true;
        await stroke.save();

        io.to(roomId).emit("undo", { strokeId });
      } catch (err) {
        socket.emit("error", "Unable to undo stroke");
      }
    });

    // ---------------------------
    // Redo (Restore Last Deleted Stroke of User)
    // ---------------------------
    socket.on("redo", async ({ roomId }) => {
      try {
        const lastDeleted = await Stroke.findOne({
          roomId,
          userId: socket.user._id,
          isDeleted: true,
        }).sort({ updatedAt: -1 });

        if (!lastDeleted) return socket.emit("error", "No stroke to redo");

        lastDeleted.isDeleted = false;
        await lastDeleted.save();

        io.to(roomId).emit("strokeComplete", {
          ...lastDeleted.toObject(),
          strokeId: lastDeleted.strokeId,
        });
      } catch (err) {
        socket.emit("error", "Unable to redo stroke");
      }
    });

    // ---------------------------
    // Clear (Soft Delete All)
    // ---------------------------
    socket.on("clear", async ({ roomId }) => {
      try {
        await Stroke.updateMany({ roomId }, { isDeleted: true });
        io.to(roomId).emit("clear");
      } catch (err) {
        socket.emit("error", "Unable to clear strokes");
      }
    });
    // ---------------------------
    // Disconnect
    // ---------------------------
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
