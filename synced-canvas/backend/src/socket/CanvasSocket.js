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
        if (!socket.user) {
          return socket.emit("error", "Not authenticated");
        }

        const userId = socket.user._id;

        // Find room WITHOUT populate first
        let room = await Room.findById(roomId);

        if (!room) {
          return socket.emit("error", "Room not found");
        }

        // Check if already member
        const isMember = room.members.some(
          (memberId) => memberId.toString() === userId.toString(),
        );

        // Add only if not exists
        if (!isMember) {
          room.members.push(userId);
          await room.save();
        }

        // IMPORTANT: Populate AFTER update
        room = await Room.findById(roomId).populate(
          "members",
          "username email",
        );

        socket.join(roomId);

        console.log(`✓ ${socket.user.username} joined room ${room.name}`);

        // Notify others (only new join)
        io.to(roomId).emit("roomUsers", room.members);

        // Send room info WITH populated members
        socket.emit("roomInfo", {
          userId: userId.toString(),
          room,
        });

        // Send strokes history
        const strokes = await Stroke.find({
          roomId,
          isDeleted: false,
        });

        socket.emit("roomHistory", strokes);
      } catch (err) {
        console.error("joinRoom error:", err.message);
        socket.emit("error", "Something went wrong joining room");
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

      // IMPORTANT: Populate AFTER update
      room = await Room.findById(roomId).populate("members", "username email");

      socket.leave(roomId);
      io.to(roomId).emit("roomUsers", room.members);
    });

    // ---------------------------
    // Stroke Start (Emit to others in room)
    // ---------------------------
    socket.on("strokeStart", ({ roomId, point, strokeId }) => {
      try {
        if (!socket.user) {
          return socket.emit("error", "Not authenticated");
        }
        // Emit to others in room
        socket.to(roomId).emit("strokeStart", {
          userId: socket.user._id.toString(),
          strokeId,
          point,
        });
      } catch (err) {
        console.error("strokeStart error:", err.message);
        socket.emit("error", "Failed to start stroke");
      }
    });

    //----------------------------
    // Stroke Point (Emit to others in room)
    //----------------------------
    socket.on(
      "strokePoint",
      ({ roomId, point, strokeId, color, brushSize }) => {
        try {
          if (!socket.user) {
            return socket.emit("error", "Not authenticated");
          }
          socket.to(roomId).emit("strokePoint", {
            userId: socket.user._id.toString(),
            strokeId,
            point,
            color,
            brushSize,
          });
        } catch (err) {
          console.error("strokePoint error:", err.message);
          socket.emit("error", "Failed to record stroke point");
        }
      },
    );

    //----------------------------
    // Stroke End (Save to DB and Emit to others in room)
    //----------------------------
    socket.on(
      "strokeEnd",
      async ({ roomId, points, strokeId, color, brushSize }) => {
        try {
          if (!socket.user) {
            return socket.emit("error", "Not authenticated");
          }
          const newStroke = await Stroke.create({
            strokeId, // frontend strokeId
            roomId,
            userId: socket.user._id,
            points,
            color,
            width: brushSize,
          });

          // Emit strokeComplete with DB _id + strokeId to ALL users in room (including sender)
          io.to(roomId).emit("strokeComplete", {
            ...newStroke.toObject(),
            strokeId: newStroke.strokeId, // keep frontend strokeId
          });
        } catch (err) {
          console.error("strokeEnd error:", err.message);
          socket.emit("error", "Failed to save stroke");
        }
      },
    );

    // ---------------------------
    // Undo (Soft Delete)
    // ---------------------------
    socket.on("undo", async ({ roomId, strokeId }) => {
      try {
        if (!socket.user) {
          return socket.emit("error", "Not authenticated");
        }

        if (!strokeId) {
          return socket.emit("error", "No strokeId provided");
        }

        const stroke = await Stroke.findOne({
          strokeId,
          userId: socket.user._id,
        });

        if (!stroke) {
          return socket.emit("error", "Stroke not found or not yours");
        }

        stroke.isDeleted = true;
        await stroke.save();

        console.log(`↶ Undo for strokeId:`, strokeId);
        io.to(roomId).emit("undo", { strokeId });
      } catch (err) {
        console.error("undo error:", err.message);
        socket.emit("error", "Unable to undo stroke");
      }
    });

    // ---------------------------
    // Redo (Restore Last Deleted Stroke of User)
    // ---------------------------
    socket.on("redo", async ({ roomId, strokeId }) => {
      try {
        if (!socket.user) {
          return socket.emit("error", "Not authenticated");
        }

        let stroke;

        // If strokeId is provided, redo that specific stroke
        if (strokeId) {
          stroke = await Stroke.findOne({
            strokeId,
            userId: socket.user._id,
            isDeleted: true,
          });
        } else {
          // Otherwise, redo the last deleted stroke
          stroke = await Stroke.findOne({
            roomId,
            userId: socket.user._id,
            isDeleted: true,
          }).sort({ updatedAt: -1 });
        }

        if (!stroke) return socket.emit("error", "No stroke to redo");

        stroke.isDeleted = false;
        await stroke.save();

        io.to(roomId).emit("strokeComplete", {
          ...stroke.toObject(),
          strokeId: stroke.strokeId,
        });
      } catch (err) {
        console.error("redo error:", err.message);
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
 socket.on("disconnect", async () => {
    console.log("✗ User disconnected:", socket.id);
    if (!socket.user) return;

    const userId = socket.user._id;

    // Find all rooms user was in
    const rooms = await Room.find({ members: userId });

    for (let room of rooms) {
      // Remove user from members
      room.members = room.members.filter(
        (member) => member.toString() !== userId.toString()
      );
      await room.save();

      // Populate members after update
      const updatedRoom = await Room.findById(room._id).populate(
        "members",
        "username email"
      );

      // Notify other users in that room
      io.to(room._id.toString()).emit("roomUsers", updatedRoom.members);
    }

    console.log("  User was:", socket.user.username, `(${userId})`);
  });
  });
}
