import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavBar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  const mobileRef = useRef(null);

  /* ---------------- Theme ---------------- */
  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  /* ---------------- Mobile outside click ---------------- */
  useEffect(() => {
    function handleClick(e) {
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ---------------- Logout ---------------- */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  /* ---------------- Avatar ---------------- */
  const avatar = () => {
    if (user?.avatarUrl) {
      return <img src={user.avatarUrl} alt="avatar" className="avatar-img" />;
    }

    const name = user?.name || "";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return <div className="avatar-fallback">{initials || "U"}</div>;
  };

  return (
    <header className="topbar">
      {/* ---------------- Brand ---------------- */}
      <div className="brand">
        <span className="logo">🏦</span>
        <Link to="/dashboard" className="title">
          CredVest
        </Link>
      </div>

      {/* ================= Desktop Menu ================= */}
      <nav className="menu">
        <Link className="item" to="/dashboard">
          Dashboard
        </Link>

        {/* -------- Banking -------- */}
        <div className="menu-group">
          <button type="button" className="group-label">
            Banking ▾
          </button>
          <div className="dropdown">
            <Link className="drop-item" to="/banking/account">
              Account Details
            </Link>
            <Link className="drop-item" to="/banking/transfer">
              Fund Transfer
            </Link>
            <Link className="drop-item" to="/banking/bill">
              Bill Payment
            </Link>
            <Link className="drop-item" to="/banking/international">
              International Transfer
            </Link>
            <Link className="drop-item" to="/banking/branches">
              Branch Locations
            </Link>
          </div>
        </div>

        {/* -------- Investments -------- */}
        <div className="menu-group">
          <button type="button" className="group-label">
            Investments ▾
          </button>
          <div className="dropdown">
            <Link className="drop-item" to="/investments/buy">
              Buy Security
            </Link>
            <Link className="drop-item" to="/investments/sell">
              Sell Security
            </Link>
            <Link className="drop-item" to="/investments/portfolio">
              Portfolio Overview
            </Link>
            <Link className="drop-item" to="/investments/stocks">
              Stock Prediction
            </Link>
          </div>
        </div>

        {/* -------- Credit -------- */}
        <div className="menu-group">
          <button type="button" className="group-label">
            Credit ▾
          </button>
          <div className="dropdown">
            <Link className="drop-item" to="/credit/cards">
              Credit Cards
            </Link>
            <Link className="drop-item" to="/credit/loans">
              Apply for Loan
            </Link>
            <Link className="drop-item" to="/credit/score">
              Credit Score
            </Link>
          </div>
        </div>

        {/* -------- Digital -------- */}
        <div className="menu-group">
          <button type="button" className="group-label">
            Digital ▾
          </button>
          <div className="dropdown">
            <Link className="drop-item" to="/digital/mobile">
              Mobile Banking
            </Link>
            <Link className="drop-item" to="/digital/qr">
              QR Payments
            </Link>
            <Link className="drop-item" to="/digital/wallet">
              Digital Wallet
            </Link>
          </div>
        </div>

        <Link className="item" to="/ocr">
          OCR Analyzer
        </Link>
        <Link className="item" to="/goals">
          Goals AI
        </Link>
        <Link className="item" to="/support">
          Support AI
        </Link>

        {/* ---------------- Right Controls ---------------- */}
        <div className="nav-controls">
          <button
            type="button"
            className={`icon-btn ${dark ? "active" : ""}`}
            onClick={() => setDark((d) => !d)}
          >
            {dark ? "🌙" : "☀️"}
          </button>

          {token ? (
            <>
              <div className="avatar">
                <Link to="/profile" className="avatar-link">
                  {avatar()}
                </Link>
              </div>
              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="item" to="/login">
                Login
              </Link>
              <Link className="item" to="/signup">
                Signup
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ================= Mobile Menu ================= */}
      <div className="mobile-wrap" ref={mobileRef}>
        <button
          type="button"
          className={`hamburger ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`mobile-panel ${mobileOpen ? "open" : ""}`}>
          <nav className="mobile-nav">
            <Link to="/dashboard" className="mobile-link">
              Dashboard
            </Link>

            <details className="mobile-details">
              <summary>Banking</summary>
              <Link className="mobile-link" to="/banking/account">
                Account Details
              </Link>
              <Link className="mobile-link" to="/banking/transfer">
                Fund Transfer
              </Link>
              <Link className="mobile-link" to="/banking/bill">
                Bill Payment
              </Link>
            </details>

            <details className="mobile-details">
              <summary>Investments</summary>
              <Link className="mobile-link" to="/investments/buy">
                Buy
              </Link>
              <Link className="mobile-link" to="/investments/portfolio">
                Portfolio
              </Link>
            </details>

            <Link className="mobile-link" to="/ocr">
              OCR Analyzer
            </Link>
            <Link className="mobile-link" to="/goals">
              Goals AI
            </Link>

            <button
              type="button"
              className="icon-btn"
              onClick={() => setDark((d) => !d)}
            >
              {dark ? "Light" : "Dark"}
            </button>

            {token ? (
              <>
                <Link to="/profile" className="mobile-link">
                  Profile
                </Link>
                <button
                  type="button"
                  className="logout-btn mobile-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="mobile-link" to="/login">
                  Login
                </Link>
                <Link className="mobile-link" to="/signup">
                  Signup
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
