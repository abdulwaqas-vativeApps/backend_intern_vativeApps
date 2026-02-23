import { useCanvasStore } from "../store/canvasStore";
import { socket } from "../socket/socket";

// ===============================
// find the last stroke ID of a user (used for undo functionality)
// ===============================
export const findLastUserStrokeId = (strokes, userId) => {
  const reversed = [...strokes].reverse();

  const lastStroke = reversed.find((stroke) => stroke.userId === userId);

  return lastStroke ? lastStroke.strokeId : null;
};

// ===============================
// undo the last stroke of the current user
// ===============================
export const undoLastStroke = (strokes, undo, currentRoom) => {
  const lastStrokeId = findLastUserStrokeId(strokes, socket.id);

  if (!lastStrokeId) return;

  undo(lastStrokeId);

  socket.emit("undo", {
    roomId: currentRoom,
    strokeId: lastStrokeId,
  });
};

// ===============================
// redo the last undo stroke of the current user
// ===============================
export const redoLastStroke = (redo, currentRoom) => {
  redo(socket.id);
  console.log("redolastStroke by Emit for user", socket.id);

  socket.emit("redo", {
    roomId: currentRoom,
    userId: socket.id,
  });
};

// ===============================
// ROOM JOINING
// ===============================
export const joinRoom = (roomId, currentRoom, clear) => {
  if (!roomId.trim()) return;

  if (currentRoom) {
    socket.emit("leaveRoom", currentRoom);
  }

  socket.emit("joinRoom", roomId);

  clear(); // reset canvas locally
};

// ===============================
// START DRAW
// ===============================
export const startDrawing = (e, setIsDrawing, startStroke, canvasRef, currentRoom) => {
  const x = e.nativeEvent.offsetX;
  const y = e.nativeEvent.offsetY;
  const strokeId = crypto.randomUUID();
  setIsDrawing(true);
  startStroke({
    userId: socket.id,
    strokeId,
    point: { x, y },
  });

  const ctx = canvasRef.current.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(x, y);

  socket.emit("strokeStart", {
    roomId: currentRoom,
    userId: socket.id,
    strokeId,
    point: { x, y },
  });
};

// ===============================
// DRAW (RAF THROTTLED)
// ===============================
export const draw = (e, isDrawing, animationFrameRef, lastPointRef, color, brushSize, addPoint, canvasRef, currentRoom) => {
  if (!isDrawing) return;

  const x = e.nativeEvent.offsetX;
  const y = e.nativeEvent.offsetY;

  lastPointRef.current = { x, y };

  if (animationFrameRef.current) return;

  animationFrameRef.current = requestAnimationFrame(() => {
    const point = lastPointRef.current;
    const ctx = canvasRef.current.getContext("2d");

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    addPoint({ userId: socket.id, point });

    // Emit to other users
    socket.emit("strokePoint", {
      roomId: currentRoom,
      userId: socket.id,
      point,
      color,
      brushSize,
    });

    animationFrameRef.current = null;
  });
};

// ===============================
// STOP DRAW
// ===============================
export const stopDrawing = (setIsDrawing, endStroke, color, brushSize, currentRoom) => {
  setIsDrawing(false);
  endStroke({ userId: socket.id, color, brushSize });

  socket.emit("strokeEnd", {
    roomId: currentRoom,
    userId: socket.id,
    color,
    brushSize,
  });
};

// ===============================
// REDRAW FUNCTION
// ===============================
export const redrawCanvas = (canvasRef) => {
  const store = useCanvasStore.getState();
  const strokes = store.strokes;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  strokes.forEach((stroke) => {
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.brushSize;

    stroke.points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();
  });
};