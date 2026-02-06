// src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setLoading(true);
    try {
      await api.post("/api/auth/signup", form);
      setMsg("✅ Signup successful. Check email for OTP.");
      // go to verify page carrying email
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setMsg(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 520 }}>
      <h3 className="mb-3">Create Account</h3>
      {msg && <div className="alert alert-info py-2">{msg}</div>}
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input className="form-control" name="name" value={form.name} onChange={onChange} required/>
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required/>
        </div>
        <div className="mb-4">
          <label className="form-label">Password</label>
          <input className="form-control" name="password" type="password" value={form.password} onChange={onChange} required/>
        </div>
        <button className="btn btn-success w-100" disabled={loading}>
          {loading ? "Creating..." : "Sign up"}
        </button>
      </form>
      <div className="mt-3">
        <Link to="/login">Already have an account? Login</Link>
      </div>
    </div>
  );
}
