import { useEffect, useState } from "react";
import { fetchAllRooms, createNewRoom } from "../services/RoomServices";
import { useNavigate } from "react-router-dom";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Fetch all rooms
  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await fetchAllRooms();
      setRooms(data);
    } catch (err) {
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

    try {
      const room = await createNewRoom({ name: newRoomName });
      setRooms((prev) => [...prev, room]);
      setModalOpen(false);
      setNewRoomName("");
      // Navigate to the new room
      navigate(`/rooms/${room._id}`);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>All Rooms</h2>
      <button onClick={() => setModalOpen(true)}>Add New Room</button>

      {loading ? (
        <p>Loading rooms...</p>
      ) : (
        <ul>
          {rooms.map((room) => (
            <li
              key={room._id}
              style={{ cursor: "pointer", margin: "5px 0" }}
              onClick={() => navigate(`/rooms/${room._id}`)}
            >
              {room.name} ({room.members?.length || 0} members)
            </li>
          ))}
        </ul>
      )}

      {/* Modal for creating new room */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              minWidth: "300px",
            }}
          >
            <h3>Create New Room</h3>
            <form onSubmit={handleCreateRoom}>
              <input
                type="text"
                placeholder="Room Name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <div style={{ marginTop: "10px" }}>
                <button type="submit">Create</button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setNewRoomName("");
                  }}
                  style={{ marginLeft: "10px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}