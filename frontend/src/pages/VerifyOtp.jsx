// src/pages/VerifyOtp.jsx
import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const email = useMemo(() => params.get("email") || "", [params]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setLoading(true);
    try {
      const { data } = await api.post("/api/auth/verify-otp", { email, code });
      localStorage.setItem("jwt", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMsg("✅ Verified!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setMsg(err.response?.data?.error || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.post("/api/auth/resend-otp", { email });
      setMsg("A new OTP has been sent.");
    } catch (err) {
      setMsg(err.response?.data?.error || "Resend failed");
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 420 }}>
      <h3 className="mb-3">Verify your email</h3>
      <p className="text-muted">OTP sent to <strong>{email}</strong></p>
      {msg && <div className="alert alert-info py-2">{msg}</div>}
      <form onSubmit={onSubmit}>
        <label className="form-label">Enter 6-digit code</label>
        <input className="form-control mb-3" value={code} onChange={(e)=>setCode(e.target.value)} maxLength={6} required/>
        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>
      <div className="d-flex justify-content-between mt-3">
        <button className="btn btn-link p-0" onClick={resend}>Resend code</button>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
}
