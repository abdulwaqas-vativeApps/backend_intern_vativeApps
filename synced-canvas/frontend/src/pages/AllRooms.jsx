import { useEffect, useState } from "react";
import { fetchAllRooms, createNewRoom } from "../services/RoomServices";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { socket } from "../socket/socket";

import {
  Plus,
  Users,
  User,
  LogOut,
  Home,
  Loader2,
  X,
  ChevronRight,
  Calendar,
  Hash,
} from "lucide-react";
import { useCanvasStore } from "../store/canvasStore";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const currentRoom = useCanvasStore((state) => state.currentRoom);

  const navigate = useNavigate();
  const currentUser = localStorage.getItem("username") || "User";

  // Fetch all rooms
  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await fetchAllRooms();
      setRooms(data);
    } catch (err) {
      toast.error("Failed to load rooms");
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Handle room creation
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError("");

    if (!newRoomName.trim()) {
      setError("Room name is required");
      return;
    }

    setCreating(true);
    try {
      const room = await createNewRoom({ name: newRoomName });
      setRooms((prev) => [room, ...prev]);
      toast.success("Room created successfully!");
      setModalOpen(false);
      setNewRoomName("");
      // Navigate to the new room
      navigate(`/rooms/${room._id}`);
    } catch (err) {
      toast.error("Failed to create room");
      setError(err);
    } finally {
      setCreating(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    if (currentRoom && currentRoom?.id) {
      socket.emit("leaveRoom", currentRoom?.id);
    }
    toast.success("Logged out successfully");
    navigate("/login");

  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Home className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Synced Canvas</h1>
            </div>

            {/* User Info and Logout */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {currentUser}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition duration-150 ease-in-out"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Rooms</h2>
            <p className="text-gray-600 mt-1">
              Join or create a room to start collaborating
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out flex items-center justify-center space-x-2 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Room</span>
          </button>
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <p className="text-gray-600">Loading rooms...</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              No Rooms Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first room to start collaborating!
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition duration-150 ease-in-out"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Room</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => navigate(`/rooms/${room._id}`)}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 overflow-hidden border border-gray-100"
              >
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <div className="p-6">
                  {/* Room Name and Member Count */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex-1">
                      {room.name}
                    </h3>
                    <div className="flex items-center space-x-1 bg-blue-50 px-3 py-1 rounded-full">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">
                        {room.members?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Room Details */}
                  <div className="space-y-3 mb-4">
                    {/* Creator Info */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="bg-gray-100 p-1.5 rounded-full">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">Created by:</span>
                      <span className="text-gray-800">
                        {room.createdBy?.username || "Unknown"}
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="bg-gray-100 p-1.5 rounded-full">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">Created:</span>
                      <span className="text-gray-800">
                        {formatDate(room.createdAt)}
                      </span>
                    </div>

                    {/* Room ID (shortened) */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="bg-gray-100 p-1.5 rounded-full">
                        <Hash className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">Room ID:</span>
                      <span className="text-gray-800 font-mono text-xs">
                        {room._id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Member List Preview (if members exist) */}
                  {room.members && room.members.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {room.members.slice(0, 3).map((member, index) => (
                            <div
                              key={index}
                              className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center border-2 border-white"
                              title={member.username}
                            >
                              <span className="text-xs font-medium text-white">
                                {member.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                          {room.members.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white">
                              <span className="text-xs font-medium text-gray-600">
                                +{room.members.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-5 overflow-y-auto">
          <div className="flex items-center justify-center inset-0 fixed">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500/30 transition-opacity"
              onClick={() => {
                setModalOpen(false);
                setNewRoomName("");
                setError("");
              }}
            ></div>

            {/* Modal panel */}
            <div className="z-90 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Create New Room</span>
                </h3>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setNewRoomName("");
                    setError("");
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Design Team, Project Meeting"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
                    autoFocus
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setNewRoomName("");
                      setError("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Create Room</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// import { useEffect, useState } from "react";
// import { fetchAllRooms, createNewRoom } from "../services/RoomServices";
// import { useNavigate } from "react-router-dom";

// export default function RoomsPage() {
//   const [rooms, setRooms] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [newRoomName, setNewRoomName] = useState("");
//   const [error, setError] = useState("");

//   const navigate = useNavigate();

//   // Fetch all rooms
//   const loadRooms = async () => {
//     setLoading(true);
//     try {
//       const data = await fetchAllRooms();
//       setRooms(data);
//     } catch (err) {
//       setError(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadRooms();
//   }, []);

//   // Handle room creation
//   const handleCreateRoom = async (e) => {
//     e.preventDefault();
//     setError("");

//     if (!newRoomName.trim()) {
//       setError("Room name is required");
//       return;
//     }

//     try {
//       const room = await createNewRoom({ name: newRoomName });
//       setRooms((prev) => [...prev, room]);
//       setModalOpen(false);
//       setNewRoomName("");
//       // Navigate to the new room
//       navigate(`/rooms/${room._id}`);
//     } catch (err) {
//       setError(err);
//     }
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>All Rooms</h2>
//       <button onClick={() => setModalOpen(true)}>Add New Room</button>

//       {loading ? (
//         <p>Loading rooms...</p>
//       ) : (
//         <ul>
//           {rooms.map((room) => (
//             <li
//               key={room._id}
//               style={{ cursor: "pointer", margin: "5px 0" }}
//               onClick={() => navigate(`/rooms/${room._id}`)}
//             >
//               {room.name} ({room.members?.length || 0} members)
//             </li>
//           ))}
//         </ul>
//       )}

//       {/* Modal for creating new room */}
//       {modalOpen && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             width: "100vw",
//             height: "100vh",
//             background: "rgba(0,0,0,0.5)",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <div
//             style={{
//               background: "white",
//               padding: "20px",
//               borderRadius: "8px",
//               minWidth: "300px",
//             }}
//           >
//             <h3>Create New Room</h3>
//             <form onSubmit={handleCreateRoom}>
//               <input
//                 type="text"
//                 placeholder="Room Name"
//                 value={newRoomName}
//                 onChange={(e) => setNewRoomName(e.target.value)}
//               />
//               <div style={{ marginTop: "10px" }}>
//                 <button type="submit">Create</button>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setModalOpen(false);
//                     setNewRoomName("");
//                   }}
//                   style={{ marginLeft: "10px" }}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//             {error && <p style={{ color: "red" }}>{error}</p>}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
