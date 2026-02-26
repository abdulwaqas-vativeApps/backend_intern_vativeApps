import Room from "../models/Room.js";
import Stroke from "../models/Stroke.js";

export default function canvasSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id, "name:", socket.user?.username);

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
        room = await Room.findById(roomId)
          .populate("members", "username email")
          .populate("createdBy", "username email");

        socket.join(roomId);

        // Notify others (only new join)
        io.to(roomId).emit("roomMembers", room.members);

        // Send room info WITH populated members
        socket.emit("roomInfo", {
          id: room._id,
          name: room.name,
          createdBy: room.createdBy,
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
      let room = await Room.findById(roomId);

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
      io.to(roomId).emit("roomMembers", room.members);
      io.to(roomId).emit(
        "userDisconnected",
        userId,
      );
    });

    // ---------------------------
    // Stroke Start (Emit to others in room)
    // ---------------------------
    socket.on("strokeStart", ({ roomId, strokeId, point }) => {
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
        // console.error("strokeStart error:", err.message);
        socket.emit("error", "Failed to start stroke");
      }
    });

    //----------------------------
    // Stroke Point (Emit to others in room)
    //----------------------------
    socket.on(
      "strokePoint",
      ({ roomId, strokeId, color, brushSize, point }) => {
        try {
          if (!socket.user) {
            return socket.emit("error", "Not authenticated");
          }
          // console.log(
          //   "🎨 strokePoint received ",
          //   "userId:",
          //   socket.user._id.toString(),
          //   "strokeId:",
          //   strokeId,
          //   "color:",
          //   color,
          //   "brushSize:",
          //   brushSize,
          //   "point:",
          //   point,
          // );
          socket.to(roomId).emit("strokePoint", {
            userId: socket.user._id.toString(),
            strokeId,
            color,
            brushSize,
            point,
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
      async ({ roomId, strokeId, color, brushSize, points }) => {
        try {
          if (!socket.user) {
            return socket.emit("error", "Not authenticated");
          }
          const newStroke = await Stroke.create({
            strokeId, // frontend strokeId
            roomId,
            userId: socket.user._id,
            color,
            width: brushSize,
            points,
          });

          // console.log("🎨 New stroke created:", newStroke);

          // Emit strokeComplete with DB _id + strokeId to ALL users in room (including sender)
          io.to(roomId).emit("strokeComplete", {
            ...newStroke.toObject(),
            strokeId: newStroke.strokeId, // frontend strokeId for matching
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
          // Otherwise, redo the last deleted stroke (currently ignore this)
          stroke = await Stroke.findOne({
            roomId,
            userId: socket.user._id,
            isDeleted: true,
          }).sort({ updatedAt: -1 });
        }

        if (!stroke) return socket.emit("error", "No stroke to redo");

        stroke.isDeleted = false;
        await stroke.save();

        io.to(roomId).emit("redoStroke", {
          ...stroke.toObject(),
          strokeId: stroke.strokeId,
        });

        console.log(`↻ Redo for strokeId:`, stroke.strokeId);
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
    // CURSOR MOVE (Presence)
    // ---------------------------
    socket.on("cursorMove", ({ roomId, x, y }) => {
      if (!socket.user) return;

      console.log("Cursor move from user:", socket.user.username, "at", { x, y });

      socket.to(roomId).emit("cursorMove", {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        x,
        y,
      });
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
        // Remove user from members (user at a time aik hi room m hoga, but phir bhi ye safety k lien)
        room.members = room.members.filter(
          (member) => member.toString() !== userId.toString(),
        );
        await room.save();

        // Populate members after update
        const updatedRoom = await Room.findById(room._id).populate(
          "members",
          "username email",
        );

        // Notify other users in that room
        io.to(room._id.toString()).emit(
          "userDisconnected",
          userId,
        );
        io.to(room._id.toString()).emit("roomMembers", updatedRoom.members);
      }

      console.log("  User was:", socket.user.username, `(${userId})`);
    });
  });
}
