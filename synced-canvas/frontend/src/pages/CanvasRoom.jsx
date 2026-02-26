import { useRef, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCanvasStore } from "../store/canvasStore";
import { socket } from "../socket/socket";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-hot-toast";
import {
  startDrawing,
  draw,
  stopDrawing,
  redrawCanvas,
  joinRoom as joinRoomUtil,
  undoLastStroke,
  redoLastStroke,
} from "../utils/canvasUtils";
import {
  Undo2,
  Redo2,
  Trash2,
  Users,
  LogOut,
  Home,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Brush,
  Crown,
  Paintbrush
} from "lucide-react";

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

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const navigate = useNavigate();

  // ===============================
  // SOCKET EVENTS
  // ===============================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        setUser(decodedUser);
      } catch (err) {
        console.error("Invalid token:", err);
        toast.error("Session expired. Please login again.");
        navigate("/login");
      }
    } else {
      navigate("/login");
    }

    socket.on("roomMembers", (members) => {
      setRoomMembers(members);
    });

    socket.on("roomInfo", (room) => {
      setCurrentRoom(room);
      toast.success(`Joined room: ${room.name}`);
    });

    socket.on("error", (errorMsg) => {
      console.error("Server error:", errorMsg);
      toast.error(errorMsg);
    });

    socket.on("strokeStart", ({ userId, strokeId, point }) => {
      startStroke({ userId, strokeId, point });
      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    });

    socket.on("strokePoint", ({ userId, strokeId, color, brushSize, point }) => {
      const store = useCanvasStore.getState();
      if (!store.currentStrokes[userId]) return;

      const ctx = canvasRef.current.getContext("2d");
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      addPoint({ userId, strokeId, point });
    });

    socket.on("strokeComplete", (stroke) => {
      endStroke(stroke);
    });

    socket.on("undo", ({ strokeId }) => {
      if (!strokeId) return;
      undo(strokeId);
    });

    socket.on("redoStroke", (stroke) => {
      if (!stroke || !stroke.strokeId) return;
      redo(stroke);
    });

    socket.on("clear", () => {
      clear();
      const ctx = canvasRef.current.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });

    socket.on("roomHistory", (strokes) => {
      setStrokes(strokes);
    });

    return () => {
      socket.off("roomInfo");
      socket.off("error");
      socket.off("strokeStart");
      socket.off("strokePoint");
      socket.off("strokeComplete");
      socket.off("undo");
      socket.off("redoStroke");
      socket.off("clear");
      socket.off("roomHistory");
      socket.off("roomMembers");
    };
  }, []);

  // ===============================
  // CANVAS SETUP
  // ===============================
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Pure white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing properties
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    // Redraw all strokes
    redrawCanvas(canvasRef);

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [color, brushSize]);

  useEffect(() => {
    redrawCanvas(canvasRef);
  }, [strokes]);

  // ===============================
  // JOIN ROOM
  // ===============================
  useEffect(() => {
    if (roomId) {
      joinRoomUtil(roomId, currentRoom?.id, clear);
    }
  }, [roomId]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");

    if (currentRoom && currentRoom._id) {
      socket.emit("leaveRoom", currentRoom._id);
    }
  };

  // Check if current user is room owner
  const isRoomOwner = currentRoom?.createdBy?._id === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/rooms")}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="Back to Rooms"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-lg font-bold text-gray-800">
                      {currentRoom?.name || 'Canvas Room'}
                    </h1>
                    {isRoomOwner && (
                      <span className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        <Crown className="h-3 w-3" />
                        <span>Owner</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    Room ID: {roomId?.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.username}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition duration-150 ease-in-out"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Members Sidebar */}
        <div 
          className={`${
            showMembers ? 'w-72' : 'w-12'
          } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-lg`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            {showMembers ? (
              <>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-700">
                    Room Members ({roomMembers.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowMembers(false)}
                  className="p-1.5 rounded-lg hover:bg-white text-gray-600 transition-colors"
                  title="Hide members"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowMembers(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 mx-auto"
                title="Show members"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Members List */}
          {showMembers && (
            <div className="flex-1 overflow-y-auto p-3">
              {roomMembers.map((member) => {
                const isOwner = currentRoom?.createdBy?._id === member._id;
                
                return (
                  <div
                    key={member._id}
                    className={`flex items-center space-x-3 p-3 rounded-lg mb-2 transition-colors ${
                      member._id === user?.id 
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                        <span className="text-sm font-semibold text-white">
                          {member.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-800">
                          {member.username}
                          {member._id === user?.id && (
                            <span className="text-blue-600 text-xs ml-1">(you)</span>
                          )}
                        </p>
                        {isOwner && (
                          <span className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
                            <Crown className="h-3 w-3" />
                            <span>Owner</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col p-6">
          {/* Toolbar */}
          <div className="mb-4 p-3 bg-white rounded-xl shadow-lg flex flex-wrap items-center gap-3 border border-gray-100">
            {/* Brush Color */}
            <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="relative group"
                title="Choose color"
              >
                <div className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm group-hover:shadow-md transition-shadow overflow-hidden">
                  <div 
                    className="w-full h-full"
                    style={{ backgroundColor: color }}
                  ></div>
                </div>
              </button>
              
              {showColorPicker && (
                <div className="absolute top-20 left-6 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 flex items-center space-x-1">
                      <Paintbrush className="h-4 w-4" />
                      <span>Pick a color</span>
                    </span>
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      setShowColorPicker(false);
                    }}
                    className="w-48 h-10 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                  className="p-1.5 rounded hover:bg-white text-gray-600 transition-colors"
                  title="Decrease brush size"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold w-10 text-center text-gray-700">
                  {brushSize}
                </span>
                <button
                  onClick={() => setBrushSize(Math.min(20, brushSize + 1))}
                  className="p-1.5 rounded hover:bg-white text-gray-600 transition-colors"
                  title="Increase brush size"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => undoLastStroke(strokes, undo, currentRoom?.id)}
                className="flex items-center space-x-1 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Undo</span>
              </button>

              <button
                onClick={() => redoLastStroke(redo, currentRoom?.id)}
                className="flex items-center space-x-1 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Redo</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear the canvas?')) {
                    clear();
                    socket.emit("clear", { roomId: currentRoom?.id });
                    const ctx = canvasRef.current.getContext("2d");
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    toast.success("Canvas cleared");
                  }
                }}
                className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                title="Clear canvas"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-xl p-4 shadow-inner">
            <canvas
              ref={canvasRef}
              width={900}
              height={500}
              className="border-2 border-gray-300 rounded-xl shadow-2xl bg-white"
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                cursor: isDrawing ? 'crosshair' : 'default',
                touchAction: 'none'
              }}
              onMouseDown={(e) =>
                startDrawing(e, setIsDrawing, startStroke, canvasRef, currentRoom?.id)
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
                  currentRoom?.id,
                )
              }
              onMouseUp={() =>
                stopDrawing(
                  setIsDrawing,
                  endStroke,
                  color,
                  brushSize,
                  currentRoom?.id,
                )
              }
              onMouseLeave={() =>
                stopDrawing(
                  setIsDrawing,
                  endStroke,
                  color,
                  brushSize,
                  currentRoom?.id,
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}





// import { useRef, useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { useCanvasStore } from "../store/canvasStore";
// import { socket } from "../socket/socket";
// import { jwtDecode } from "jwt-decode";
// import {
//   startDrawing,
//   draw,
//   stopDrawing,
//   redrawCanvas,
//   joinRoom as joinRoomUtil,
//   undoLastStroke,
//   redoLastStroke,
// } from "../utils/canvasUtils";

// export default function CanvasRoom() {
//   const { roomId } = useParams();

//   const canvasRef = useRef(null);
//   const animationFrameRef = useRef(null);
//   const lastPointRef = useRef(null);

//   const strokes = useCanvasStore((state) => state.strokes);
//   const user = useCanvasStore((state) => state.user);
//   const startStroke = useCanvasStore((state) => state.startStroke);
//   const addPoint = useCanvasStore((state) => state.addPoint);
//   const endStroke = useCanvasStore((state) => state.endStroke);
//   const undo = useCanvasStore((state) => state.undo);
//   const redo = useCanvasStore((state) => state.redo);
//   const clear = useCanvasStore((state) => state.clear);
//   const currentRoom = useCanvasStore((state) => state.currentRoom);
//   const roomMembers = useCanvasStore((state) => state.roomMembers);
//   const setRoomMembers = useCanvasStore((state) => state.setRoomMembers);
//   const setCurrentRoom = useCanvasStore((state) => state.setCurrentRoom);
//   const setStrokes = useCanvasStore((state) => state.setStrokes);
//   const setUser = useCanvasStore((state) => state.setUser);

//   const [color, setColor] = useState("#ffffff");
//   const [brushSize, setBrushSize] = useState(5);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const Navigate = useNavigate();

//   // ===============================
//   // SOCKET EVENTS
//   // ===============================
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       try {
//         const decodedUser = jwtDecode(token);
//         setUser(decodedUser);
//       } catch (err) {
//         console.error("Invalid token:", err);
//         Navigate("/login");
//       }
//     } else {
//       Navigate("/login");
//     }

//     socket.on("roomMembers", (members) => {
//       // console.log("Updated members:", members);

//       setRoomMembers(members);
//     });

//     socket.on("roomInfo", (room) => {
//       // console.log("Received room info:", room);
//       setCurrentRoom(room);
//     });

//     socket.on("error", (errorMsg) => {
//       console.error("Server error:", errorMsg);
//     });

//     socket.on("strokeStart", ({ userId, strokeId, point }) => {
//       // console.log(
//       //   "🎨 strokeStart received ",

//       //   "userId:",
//       //   userId,
//       //   "strokeId:",
//       //   strokeId,
//       //   "point:",
//       //   point,
//       // );
//       startStroke({ userId, strokeId, point });
//       const ctx = canvasRef.current.getContext("2d");
//       ctx.beginPath();
//       ctx.moveTo(point.x, point.y);
//     });

//     socket.on(
//       "strokePoint",
//       ({ userId, strokeId, color, brushSize, point }) => {
//         const store = useCanvasStore.getState();
//         if (!store.currentStrokes[userId]) return;

//         const ctx = canvasRef.current.getContext("2d");
//         ctx.strokeStyle = color;
//         ctx.lineWidth = brushSize;
//         ctx.lineCap = "round";
//         ctx.lineJoin = "round";

//         ctx.lineTo(point.x, point.y);
//         ctx.stroke();

//         // console.log(
//         //   "🎨 strokePoint received ",
//         //   "userId:",
//         //   userId,
//         //   "strokeId:",
//         //   strokeId,
//         //   "point:",
//         //   point,
//         // );
//         addPoint({ userId, strokeId, point });
//       },
//     );

//     socket.on("strokeComplete", (stroke) => {
//       endStroke(stroke);
//       // console.log("🎨 strokeComplete received", stroke);
//     });

//     socket.on("undo", ({ strokeId }) => {
//       if (!strokeId) {
//         // console.log("socket.on('undo') ==> event with no strokeId");
//         return;
//       }
//       // console.log("↶ Undo received for strokeId:", strokeId);
//       undo(strokeId);
//     });

//     socket.on("redoStroke", (stroke) => {
//       if (!stroke || !stroke.strokeId) {
//         // console.log("socket.on('redo') ==> event with no stroke or strokeId");
//         return;
//       }
//       // console.log("↻ Redo received for strokeId:", stroke.strokeId);
//       redo(stroke);
//     });

//     // view this on future after clear user can not redo
//     socket.on("clear", () => clear());
//     socket.on("roomHistory", (strokes) => {
//       setStrokes(strokes);
//     });

//     return () => {
//       socket.off("roomInfo");
//       socket.off("error");
//       socket.off("strokeStart");
//       socket.off("strokePoint");
//       socket.off("strokeComplete");
//       socket.off("undo");
//       socket.off("redoStroke");
//       socket.off("clear");
//       socket.off("roomHistory");
//       socket.off("roomMembers");
//     };
//   }, []);

//   // console.log("Current User:", user);
//   // console.log("Current Room:", currentRoom);

//   // ===============================
//   // CANVAS SETUP
//   // ===============================
//   useEffect(() => {
//     if (!canvasRef.current) return;

//     const ctx = canvasRef.current.getContext("2d");
//     ctx.lineCap = "round";
//     ctx.lineJoin = "round";

//     return () => {
//       if (animationFrameRef.current)
//         cancelAnimationFrame(animationFrameRef.current);
//     };
//   }, []);

//   useEffect(() => {
//     redrawCanvas(canvasRef);
//   }, [strokes]);

//   // ===============================
//   // JOIN ROOM
//   // ===============================
//   useEffect(() => {
//     if (roomId) {
//       // console.log("Attempting to join room: clear ========>", clear);
//       joinRoomUtil(roomId, currentRoom?.id, clear);
//     }
//   }, [roomId]);

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>Synced Canvas - Room: {currentRoom?.name}</h2>
//       <h2>Total Members: {roomMembers.length || 0}</h2>
//       <h3>Active Users List</h3>
//       <ul>
//         {roomMembers.map((member) => (
//           <li key={member._id}>{member.username}</li>
//         ))}
//       </ul>
//       <p>Logged in as: {user?.username}</p>

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
//         <button onClick={() => undoLastStroke(strokes, undo, currentRoom?.id)}>
//           Undo
//         </button>
//         <button onClick={() => redoLastStroke(redo, currentRoom?.id)}>
//           Redo
//         </button>
//         <button
//           onClick={() => {
//             clear();
//             socket.emit("clear", { roomId: currentRoom?.id });
//           }}
//         >
//           Clear
//         </button>
//       </div>

//       <canvas
//         ref={canvasRef}
//         width={900}
//         height={500}
//         style={{ border: "2px solid black", background: "black" }}
//         onMouseDown={(e) =>
//           startDrawing(e, setIsDrawing, startStroke, canvasRef, currentRoom?.id)
//         }
//         onMouseMove={(e) =>
//           draw(
//             e,
//             isDrawing,
//             animationFrameRef,
//             lastPointRef,
//             color,
//             brushSize,
//             addPoint,
//             canvasRef,
//             currentRoom?.id,
//           )
//         }
//         onMouseUp={() =>
//           stopDrawing(
//             setIsDrawing,
//             endStroke,
//             color,
//             brushSize,
//             currentRoom?.id,
//           )
//         }
//         onMouseLeave={() =>
//           stopDrawing(
//             setIsDrawing,
//             endStroke,
//             color,
//             brushSize,
//             currentRoom?.id,
//           )
//         }
//       />
//     </div>
//   );
// }
