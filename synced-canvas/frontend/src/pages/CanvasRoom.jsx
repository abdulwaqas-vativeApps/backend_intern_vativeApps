import { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCanvasStore } from "../store/canvasStore";
import { socket } from "../socket/socket";
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
  const startStroke = useCanvasStore((state) => state.startStroke);
  const addPoint = useCanvasStore((state) => state.addPoint);
  const endStroke = useCanvasStore((state) => state.endStroke);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const clear = useCanvasStore((state) => state.clear);
  const currentRoom = useCanvasStore((state) => state.currentRoom);
  const setCurrentRoom = useCanvasStore((state) => state.setCurrentRoom);
  const setStrokes = useCanvasStore((state) => state.setStrokes);
  const setUserId = useCanvasStore((state) => state.setUserId);

  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);

  // ===============================
  // SOCKET EVENTS
  // ===============================
  useEffect(() => {
    socket.on("roomInfo", ({ userId }) => {
      console.log("✓ Received roomInfo with userId:", userId);
      setUserId(userId);
    });

    socket.on("error", (errorMsg) => {
      console.error("Server error:", errorMsg);
    });

    socket.on("strokeStart", ({ userId, strokeId, point }) => {
      console.log("Received strokeStart from user:", userId);
      startStroke({ userId, strokeId, point });
      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    });

    socket.on("strokePoint", ({ userId, point, color, brushSize }) => {
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
      console.log("✓ Received roomHistory with", strokes.length, "strokes");
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
    };
  }, []);

  // ===============================
  // CANVAS SETUP
  // ===============================
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
      joinRoomUtil(roomId, setCurrentRoom, clear, setStrokes);
    }
  }, [roomId]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Synced Canvas - Room: {currentRoom}</h2>

      <div style={{ marginBottom: "10px" }}>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(e.target.value)}
        />
        <button onClick={() => undoLastStroke(strokes, undo, currentRoom)}>Undo</button>
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
        onMouseDown={(e) => startDrawing(e, setIsDrawing, startStroke, canvasRef, currentRoom)}
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
            currentRoom
          )
        }
        onMouseUp={() => stopDrawing(setIsDrawing, endStroke, color, brushSize, currentRoom)}
        onMouseLeave={() => stopDrawing(setIsDrawing, endStroke, color, brushSize, currentRoom)}
      />
    </div>
  );
}