import { useCanvasStore } from "../store/canvasStore";
import { socket } from "../socket/socket";

// ===============================
// find the last stroke ID of a user (used for undo functionality)
// ===============================
export const findLastUserStrokeId = (strokes, userId) => {
  const reversed = [...strokes].reverse();
  const lastStroke = reversed.find((stroke) => stroke.user.id === userId);
  return lastStroke ? lastStroke.strokeId : null;
};

// ===============================
// undo the last stroke of the current user
// ===============================
export const undoLastStroke = (strokes, undo, currentRoom) => {
  const store = useCanvasStore.getState();
  const userId = store.user.id;
  const lastStrokeId = findLastUserStrokeId(strokes, userId);
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
  const store = useCanvasStore.getState();
  const undoStack = store.undoStack;

  if (undoStack.length === 0) {
    console.warn("⚠ Nothing to redo");
    return;
  }

  // Get the last undone stroke (most recent)
  const lastUndoneStroke = undoStack[undoStack.length - 1];

  if (!lastUndoneStroke || !lastUndoneStroke.strokeId) {
    console.error("Invalid stroke in undo stack:", lastUndoneStroke);
    return;
  }

  console.log("↻ Redoing stroke:", lastUndoneStroke.strokeId);
  redo(lastUndoneStroke);

  socket.emit("redo", {
    roomId: currentRoom,
    strokeId: lastUndoneStroke.strokeId,
  });
};

// ===============================
// ROOM JOINING
// ===============================
export const joinRoom = (roomId, currentRoomId, clear) => {
  if (!roomId.trim()) return;

  if (currentRoomId && currentRoomId !== roomId) {
    socket.emit("leaveRoom", currentRoomId);
  }

  console.log("📍 Joining room:", roomId);
  socket.emit("joinRoom", { roomId });

  clear();
};

// ===============================
// START DRAW
// ===============================
export const startDrawing = (
  e,
  setIsDrawing,
  startStroke,
  canvasRef,
  currentRoomId,
) => {
  const store = useCanvasStore.getState();
  const userId = store.user.id;

  if (!userId) {
    console.log("Cannot start stroke - userId not found");
    return;
  }

  const x = e.nativeEvent.offsetX;
  const y = e.nativeEvent.offsetY;
  const strokeId = crypto.randomUUID();
  setIsDrawing(true);
  startStroke({
    userId,
    strokeId,
    point: { x, y },
  });

  const ctx = canvasRef.current.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(x, y);

  // console.log(
  //   "🎨 strokeStart sent for room:",
  //   currentRoomId,
  //   "strokeId:",
  //   strokeId,
  // );
  socket.emit("strokeStart", {
    roomId: currentRoomId,
    strokeId,
    point: { x, y },
  });

  console.log(
    "🎨 strokeStart emitted",
    "userId:",
    userId,
    "strokeId:",
    strokeId,
    "point:",
    { x, y },
  );
};

// ===============================
// DRAW (RAF THROTTLED)
// ===============================
export const draw = (
  e,
  isDrawing,
  animationFrameRef,
  lastPointRef,
  color,
  brushSize,
  addPoint,
  canvasRef,
  currentRoomId,
) => {
  if (!isDrawing) return;

  const store = useCanvasStore.getState();
  const userId = store.user.id;
  const strokeId = store.currentStrokes[userId]?.strokeId;

  console.log("store.currentStrokes[userId]", store.currentStrokes[userId]);
  console.log(
    "store.currentStrokes[userId]?.strokeId",
    store.currentStrokes[userId]?.strokeId,
  );

  if (!userId) {
    console.log("Cannot add point - userId not found");
    return;
  }

  const x = e.nativeEvent.offsetX;
  const y = e.nativeEvent.offsetY;

  lastPointRef.current = { x, y };

  if (animationFrameRef.current) return;

  animationFrameRef.current = requestAnimationFrame(() => {
    const point = lastPointRef.current;
    const ctx = canvasRef.current.getContext("2d");

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    addPoint({ userId, strokeId, point });

    socket.emit("strokePoint", {
      roomId: currentRoomId,
      strokeId,
      color,
      brushSize,
      point,
    });

    console.log(
      "🎨 strokePoint emitted",
      "userId:",
      userId,
      "strokeId:",
      strokeId,
      "point:",
      point,
    );

    animationFrameRef.current = null;
  });
};

// ===============================
// STOP DRAW
// ===============================
export const stopDrawing = (
  setIsDrawing,
  endStroke,
  color,
  brushSize,
  currentRoomId,
) => {
  setIsDrawing(false);

  // Get the current stroke data from the store
  const store = useCanvasStore.getState();
  const userId = store.user.id;
  const currentStroke = store.currentStrokes[userId];

  if (currentStroke) {
    const { strokeId, points } = currentStroke;

    endStroke({ userId, strokeId, color, brushSize, points });

    socket.emit("strokeEnd", {
      roomId: currentRoomId,
      strokeId,
      color,
      brushSize,
      points,
    });

    console.log(
      "🎨 strokeEnd emitted",
     
      "strokeId:",
      strokeId,
      "color:",
      color,
      "brushSize:",
      brushSize,
      "points:",
      points,
      );
  }
};

// ===============================
// REDRAW FUNCTION
// ===============================
export const redrawCanvas = (canvasRef) => {
  const store = useCanvasStore.getState();
  const strokes = store.strokes;

  if (!canvasRef.current) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!strokes || !Array.isArray(strokes)) return;

  strokes.forEach((stroke) => {
    // Skip strokes without points
    if (!stroke || !stroke.points || !Array.isArray(stroke.points)) {
      console.warn("Skipping invalid stroke:", stroke);
      return;
    }

    ctx.beginPath();
    ctx.strokeStyle = stroke.color || "#ffffff";
    ctx.lineWidth = stroke.brushSize || stroke.width || 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    stroke.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });

    ctx.stroke();
  });
};
