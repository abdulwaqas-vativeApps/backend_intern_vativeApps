import api from "./AxiosInstance";

/**
 * Get all rooms
 */
export const fetchAllRooms = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw "No token found, please login";

  try {
    const res = await api.get("/rooms");
    return res.data.data; // rooms array
  } catch (err) {
    throw err.response?.data?.message || err.message;
  }
};

/**
 * Create a new room
 * @param {Object} roomData - { name }
 */
export const createNewRoom = async (roomData) => {
  const token = localStorage.getItem("token");
  if (!token) throw "No token found, please login";

  try {
    const res = await api.post("/rooms/create", roomData);
    return res.data.data; // newly created room
  } catch (err) {
    throw err.response?.data?.message || err.message;
  }
};