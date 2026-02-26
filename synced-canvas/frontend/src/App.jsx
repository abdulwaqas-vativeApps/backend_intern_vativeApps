import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import RegisterPage from "./pages/Register";
import LoginPage from "./pages/Login";
import RoomsPage from "./pages/AllRooms";
import CanvasRoom from "./pages/CanvasRoom";
import { Toaster } from "react-hot-toast";

function App() {
  // simple auth check based on token
  const token = localStorage.getItem("token");
  console.log("App.jsx - token:", token);


  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to={token ? "/rooms" : "/login"} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/rooms"
          element={token ? <RoomsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/rooms/:roomId"
          element={token ? <CanvasRoom /> : <Navigate to="/login" />}
        />
        {/* fallback */}
        <Route path="*" element={<p>404 Page Not Found</p>} />
      </Routes>
    </Router>
  );
}

export default App;