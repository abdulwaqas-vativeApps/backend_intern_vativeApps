// src/pages/LoginPage.js
import { useState } from "react";
import { loginUser } from "../services/AuthServices";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const data = await loginUser(form);
      setMessage(data.message);
      // save token
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("username", data.data.user.username);
    } catch (err) {
      setMessage(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input name="email" value={form.email} onChange={handleChange} />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}