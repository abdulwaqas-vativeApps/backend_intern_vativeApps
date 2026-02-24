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
          console.error("joinRoom: socket.user is undefined - authentication failed");
          return socket.emit("error", "Not authenticated");
        }

        const room = await Room.findById(roomId);

        if (!room) {
          console.error(`joinRoom: Room ${roomId} not found`);
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
        console.log(
          `✓ User ${socket.user.username} (${socket.user._id}) joined room ${roomId}`,
        );

        // Notify others
        socket.to(roomId).emit("userJoined", {
          userId: userId.toString(),
          username: socket.user.username,
        });

        // Send room info (including user's database ID) and history
        socket.emit("roomInfo", {
          userId: userId.toString(),
        });

        const strokes = await Stroke.find({
          roomId,
          isDeleted: false,
        });

        console.log(`✓ Sending ${strokes.length} strokes to user ${socket.user.username}`);
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
      try {
        if (!socket.user) {
          return socket.emit("error", "Not authenticated");
        }
        // Emit to others in room
        socket
          .to(roomId)
          .emit("strokeStart", { userId: socket.user._id.toString(), strokeId, point });
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
    socket.on("disconnect", () => {
      console.log(`✗ User disconnected:`, socket.id);
      if (socket.user) {
        console.log(
          `  User was: ${socket.user.username} (${socket.user._id})`,
        );
      }
    });
  });
}
