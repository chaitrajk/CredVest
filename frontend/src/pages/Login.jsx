// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", form);

      // Save token
      localStorage.setItem("token", res.data?.token);

      setMsg("✅ Login successful!");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      setMsg(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 520 }}>
      <h3 className="mb-3">Login</h3>

      {msg && <div className="alert alert-info py-2">{msg}</div>}

      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            className="form-control"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="form-label">Password</label>
          <input
            className="form-control"
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="mt-3">
        <Link to="/signup">Don't have an account? Sign up</Link>
      </div>
    </div>
  );
}
