import { useRef, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCanvasStore } from "../store/canvasStore";
import { socket } from "../socket/socket";
import jwt_decode from "jwt-decode";
import {
  startDrawing,
  draw,
  stopDrawing,
  redrawCanvas,
  joinRoom as joinRoomUtil,
  undoLastStroke,
  redoLastStroke,

} from "../utils/canvasUtils";

export default function CanvasRoom() {
  const { roomId } = useParams();

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastPointRef = useRef(null);

  const strokes = useCanvasStore((state) => state.strokes);
  const user = useCanvasStore((state) => state.user);
  const startStroke = useCanvasStore((state) => state.startStroke);
  const addPoint = useCanvasStore((state) => state.addPoint);
  const endStroke = useCanvasStore((state) => state.endStroke);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const clear = useCanvasStore((state) => state.clear);
  const currentRoom = useCanvasStore((state) => state.currentRoom);
  const roomMembers = useCanvasStore((state) => state.roomMembers);
  const setRoomMembers = useCanvasStore((state) => state.setRoomMembers);
  const setCurrentRoom = useCanvasStore((state) => state.setCurrentRoom);
  const setStrokes = useCanvasStore((state) => state.setStrokes);
  const setUser = useCanvasStore((state) => state.setUser);

  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const Navigate = useNavigate();

  // ===============================
  // SOCKET EVENTS
  // ===============================
  useEffect(() => {

 const token = localStorage.getItem("token");
  if (token) {
    try {
      const decodedUser = jwt_decode(token);
      setUser(decodedUser);
    } catch (err) {
      console.error("Invalid token:", err);
      Navigate("/login");
    }
  } else {
    Navigate("/login");
  }

    socket.on("roomMembers", (members) => {
      console.log("Updated members:", members);

      setRoomMembers(members);
    });

    socket.on("roomInfo", ({ room }) => {
      setCurrentRoom(room);
    });

    socket.on("error", (errorMsg) => {
      console.error("Server error:", errorMsg);
    });

    socket.on("strokeStart", ({ userId, strokeId, point }) => {
      startStroke({ userId, strokeId, point });
      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    });

    socket.on("strokePoint", ({userId, point, color, brushSize }) => {
      const store = useCanvasStore.getState();
      if (!store.currentStrokes[userId]) return;

      const ctx = canvasRef.current.getContext("2d");
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      addPoint({ userId, point });
    });

    socket.on("strokeEnd", ({ userId, color, brushSize }) => {
      endStroke({ userId, color, brushSize });
    });

    socket.on("undo", ({ strokeId }) => {
      if (!strokeId) {
        console.error("Received undo event with no strokeId");
        return;
      }
      console.log("↶ Undo received for strokeId:", strokeId);
      undo(strokeId);
    });

    socket.on("redo", ({ stroke }) => {
      if (!stroke) {
        console.error("Received redo event with no stroke");
        return;
      }
      console.log("↻ Redo received for strokeId:", stroke.strokeId);
      redo(stroke);
    });

    socket.on("strokeComplete", (stroke) => {
      if (!stroke || !stroke.strokeId) {
        console.error("Received invalid strokeComplete:", stroke);
        return;
      }
      console.log("Received strokeComplete:", stroke.strokeId);
      redo(stroke);
    });
    socket.on("clear", () => clear());
    socket.on("roomHistory", (strokes) => {
      setStrokes(strokes);
    });

    return () => {
      socket.off("roomInfo");
      socket.off("error");
      socket.off("strokeStart");
      socket.off("strokePoint");
      socket.off("strokeEnd");
      socket.off("undo");
      socket.off("strokeComplete");
      socket.off("clear");
      socket.off("roomHistory");
      socket.off("roomMembers");
    };
  }, []);

  console.log("Current User:", user);

  // ===============================
  // CANVAS SETUP
  // ===============================
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    redrawCanvas(canvasRef);
  }, [strokes]);

  // ===============================
  // JOIN ROOM
  // ===============================
  useEffect(() => {
    if (roomId) {
      console.log("Attempting to join room: clear ========>", clear);
      joinRoomUtil(roomId, currentRoom?.id, clear);
    }
  }, [roomId]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Synced Canvas - Room: {currentRoom?.name}</h2>
      <h2>Total Members: {currentRoom?.members?.length || 0}</h2>
      <h3>Active Users List</h3>
      <ul>
        {currentRoom?.members?.map((member) => (
          <li key={member._id}>{member.username}</li>
        ))}
      </ul>
      <p>Logged in as: {user?.username}</p>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(e.target.value)}
        />
        <button onClick={() => undoLastStroke(strokes, undo, currentRoom)}>
          Undo
        </button>
        <button onClick={() => redoLastStroke(redo, currentRoom)}>Redo</button>
        <button
          onClick={() => {
            clear();
            socket.emit("clear", { roomId: currentRoom });
          }}
        >
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        style={{ border: "2px solid black", background: "black" }}
        onMouseDown={(e) =>
          startDrawing(e, setIsDrawing, startStroke, canvasRef, currentRoom)
        }
        onMouseMove={(e) =>
          draw(
            e,
            isDrawing,
            animationFrameRef,
            lastPointRef,
            color,
            brushSize,
            addPoint,
            canvasRef,
            currentRoom,
          )
        }
        onMouseUp={() =>
          stopDrawing(setIsDrawing, endStroke, color, brushSize, currentRoom)
        }
        onMouseLeave={() =>
          stopDrawing(setIsDrawing, endStroke, color, brushSize, currentRoom)
        }
      />
    </div>
  );
}
