import { useRef, useEffect, useState, use } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { socket } from "../socket/socket";
import { undoLastStroke, redoLastStroke, joinRoom, startDrawing, draw, stopDrawing, redrawCanvas } from "../utils/canvasUtils";

export default function CanvasBoard() {
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

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const [roomId, setRoomId] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);

  // console.log("CanvasBoard Rendered with strokes:", strokes);

  // ===============================
  // SOCKET SETUP
  // ===============================
  useEffect(() => {
    socket.on("strokeStart", ({ userId, strokeId, point }) => {
      startStroke({ userId, strokeId, point });

      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    });

    socket.on("strokePoint", ({ userId, point, color, brushSize }) => {
      const store = useCanvasStore.getState();

      // check stroke exists
      if (!store.currentStrokes[userId]) {
        console.warn("Received strokePoint before strokeStart");
        return;
      }

      const ctx = canvasRef.current.getContext("2d");

      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;

      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      addPoint({ userId, point });
    });

    socket.on("strokeEnd", ({ userId, color, brushSize }) => {
      endStroke({ userId, color, brushSize });
    });

    socket.on("undo", ({ strokeId }) => {
      undo(strokeId);
    });

    socket.on("redo", ({ userId }) => {
      console.log("Redoing stroke by ON:", userId);
      redo(userId);
    });

    socket.on("clear", () => {
      clear();
    });

    return () => {
      socket.off("strokeStart");
      socket.off("strokePoint");
      socket.off("strokeEnd");
      socket.off("undo");
      socket.off("redo");
      socket.off("clear");
    };
  }, []);

  // ===============================
  // CANVAS INIT
  // ===============================
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    redrawCanvas(canvasRef);
  }, [strokes]);

  const handleJoinRoom = () => {
    joinRoom(roomId, currentRoom, clear);
    setCurrentRoom(roomId);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Zustand Synced Canvas</h2>

      <div style={{ marginBottom: "10px" }}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>

        {currentRoom && <p>Current Room: {currentRoom}</p>}
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
        onMouseMove={(e) => draw(e, isDrawing, animationFrameRef, lastPointRef, color, brushSize, addPoint, canvasRef, currentRoom)}
        onMouseUp={() => stopDrawing(setIsDrawing, endStroke, color, brushSize, currentRoom)}
        onMouseLeave={() => stopDrawing(setIsDrawing, endStroke, color, brushSize, currentRoom)}
      />
    </div>
  );
}

//  ###########################################################################

// Use State and Local Storage for Stroke Management

// ############################################################################

// import { useRef, useState, useEffect } from "react";

// export default function CanvasBoard() {
//   const canvasRef = useRef(null);

//   const [isDrawing, setIsDrawing] = useState(false);
//   const [color, setColor] = useState("#000000");
//   const [brushSize, setBrushSize] = useState(5);

//   // Stroke capture (project document ke hisaab se)
//   const [currentStroke, setCurrentStroke] = useState([]);
//   const lsStrokes = localStorage.getItem('canvasStrokes');
//   const [strokes, setStrokes] = useState(lsStrokes ? JSON.parse(lsStrokes) : []);

//   // Initialize canvas context on mount
//   useEffect(() => {
//     console.log("CanvasBoard Mounted");
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     ctx.lineCap = "round";
//     ctx.lineJoin = "round";
//   }, []);

//  // Redraw canvas whenever strokes change (useful for syncing and clearing)
//   useEffect(() => {
//   localStorage.setItem('canvasStrokes', JSON.stringify(strokes));
//   redrawCanvas();
//   console.log("Strokes Updated:", strokes);
// }, [strokes]);

//   // Drawing Start function initializes the stroke and captures the starting point
//   const startDrawing = (e) => {
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     const x = e.nativeEvent.offsetX;
//     const y = e.nativeEvent.offsetY;

//     setIsDrawing(true);
//     setCurrentStroke([{ x, y }]);

//     ctx.beginPath();
//     ctx.moveTo(x, y);
//   };

//   // Draw function captures points and updates the stroke in real-time
//   const draw = (e) => {
//     if (!isDrawing) return;

//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     const x = e.nativeEvent.offsetX;
//     const y = e.nativeEvent.offsetY;

//     ctx.strokeStyle = color;
//     ctx.lineWidth = brushSize;

//     ctx.lineTo(x, y);
//     ctx.stroke();

//     // Capture points for socket packet
//     setCurrentStroke((prev) => [...prev, { x, y }]);
//   };

//   // Stop drawing and prepare stroke packet
//   const stopDrawing = () => {
//     setIsDrawing(false);

//     console.log("Current Stroke Points:", currentStroke);

//     if (currentStroke.length > 0) {
//       const newStroke = {
//         strokeId: crypto.randomUUID(),
//         color,
//         brushSize,
//         points: currentStroke,
//       };
//       setStrokes((prev) => [...prev, newStroke]);
//       setCurrentStroke([]);
//     }
//   };

//   // Clear canvas function
//   const clearBoard = () => {
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     console.log("Canvas Width:", canvas.width, "Canvas Height:", canvas.height);
//   };

//   // Undo last stroke function
//   const undoLastStroke = () => {
//   setStrokes((prev) => prev.slice(0, -1));
// };

//   // Redraw canvas function to render all strokes (useful for syncing and clearing)
//   const redrawCanvas = () => {
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     strokes.forEach((stroke) => {
//       ctx.beginPath();
//       ctx.strokeStyle = stroke.color;
//       ctx.lineWidth = stroke.brushSize;

//       stroke.points.forEach((point, index) => {
//         if (index === 0) {
//           ctx.moveTo(point.x, point.y);
//         } else {
//           ctx.lineTo(point.x, point.y);
//         }
//       });

//       ctx.stroke();
//     });
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>Synced Canvas - Local Version</h2>

//       <div style={{ marginBottom: "10px" }}>
//         <input
//           type="color"
//           value={color}
//           onChange={(e) => setColor(e.target.value)}
//         />

//         <input
//           type="range"
//           min="1"
//           max="20"
//           value={brushSize}
//           onChange={(e) => setBrushSize(e.target.value)}
//         />
//         <button onClick={undoLastStroke}>Undo</button>
//         <button onClick={clearBoard}>Clear</button>
//       </div>

//       <canvas
//         ref={canvasRef}
//         width={900}
//         height={500}
//         style={{ border: "2px solid black", background: "white" }}
//         onMouseDown={startDrawing}
//         onMouseMove={draw}
//         onMouseUp={stopDrawing}
//         onMouseLeave={stopDrawing}
//       />
//     </div>
//   );
// }
