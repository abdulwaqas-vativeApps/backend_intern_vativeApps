import api from "./AxiosInstance";


/**
 * Register a new user
 * @param {Object} userData - { username, email, password }
 * @returns Axios response
 */
export const registerUser = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData);
    return response.data; 
  } catch (err) {
    throw err.response?.data?.message || err.message;
  }
};

/**
 * Login a user
 * @param {Object} loginData - { email, password }
 * @returns Axios response
 */
export const loginUser = async (loginData) => {
  try {
    const response = await api.post("/auth/login", loginData);
    return response.data;
  } catch (err) {
    throw err.response?.data?.message || err.message;
  }
};