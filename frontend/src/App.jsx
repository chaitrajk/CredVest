// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";

/* 🌐 Main Pages */
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Support from "./pages/Support";
import StockPrediction from "./pages/StockPrediction";
import OCRAnalyzer from "./pages/OCRAnalyzer";

/* 🏦 Banking Pages */
import BankingAccount from "./pages/BankingAccount";
import BankingTransfer from "./pages/BankingTransfer";
import BankingBill from "./pages/BankingBill";
import BankingInternational from "./pages/BankingInternational";
import BankingBranches from "./pages/BankingBranches";

/* 💰 Investment Pages */
import InvestBuy from "./pages/InvestBuy";
import InvestSell from "./pages/InvestSell";
import InvestHoldings from "./pages/InvestHoldings";
import InvestPortfolio from "./pages/InvestPortfolio";

/* 💳 Credit Pages */
import CreditCards from "./pages/CreditCards";
import CreditLoans from "./pages/CreditLoans";
import CreditScore from "./pages/CreditScore";

/* 📱 Digital Services */
import DigitalMobile from "./pages/DigitalMobile";
import DigitalQR from "./pages/DigitalQR";
import DigitalWallet from "./pages/DigitalWallet";

/* 🔐 Auth Pages */
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOtp from "./pages/VerifyOtp";

/* 🔐 Auth Guard */
import RequireAuth from "./components/RequireAuth";

/* 🧾 Transactions */
import Transactions from "./pages/Transactions";

function AppShell() {
  const location = useLocation();

  const hideNavbarOn = ["/login", "/signup", "/verify"];
  const shouldHideNavbar = hideNavbarOn.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}

      <div className="content">
        <Routes>
          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify" element={<VerifyOtp />} />

          {/* ================= DASHBOARD ================= */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          {/* ================= BANKING (FIXED) ================= */}
          <Route
            path="/banking/account"
            element={
              <RequireAuth>
                <BankingAccount />
              </RequireAuth>
            }
          />
          <Route
            path="/banking/transfer"
            element={
              <RequireAuth>
                <BankingTransfer />
              </RequireAuth>
            }
          />
          <Route
            path="/banking/bill"
            element={
              <RequireAuth>
                <BankingBill />
              </RequireAuth>
            }
          />
          <Route
            path="/banking/international"
            element={
              <RequireAuth>
                <BankingInternational />
              </RequireAuth>
            }
          />
          <Route
            path="/banking/branches"
            element={
              <RequireAuth>
                <BankingBranches />
              </RequireAuth>
            }
          />

          {/* ================= TRANSACTIONS ================= */}
          <Route
            path="/transactions"
            element={
              <RequireAuth>
                <Transactions />
              </RequireAuth>
            }
          />

          {/* ================= INVESTMENTS ================= */}
          <Route
            path="/investments/buy"
            element={
              <RequireAuth>
                <InvestBuy />
              </RequireAuth>
            }
          />
          <Route
            path="/investments/sell"
            element={
              <RequireAuth>
                <InvestSell />
              </RequireAuth>
            }
          />
          <Route
            path="/investments/holdings"
            element={
              <RequireAuth>
                <InvestHoldings />
              </RequireAuth>
            }
          />
          <Route
            path="/investments/portfolio"
            element={
              <RequireAuth>
                <InvestPortfolio />
              </RequireAuth>
            }
          />
          <Route
            path="/investments/stocks"
            element={
              <RequireAuth>
                <StockPrediction />
              </RequireAuth>
            }
          />

          {/* ================= CREDIT ================= */}
          <Route
            path="/credit/cards"
            element={
              <RequireAuth>
                <CreditCards />
              </RequireAuth>
            }
          />
          <Route
            path="/credit/loans"
            element={
              <RequireAuth>
                <CreditLoans />
              </RequireAuth>
            }
          />
          <Route
            path="/credit/score"
            element={
              <RequireAuth>
                <CreditScore />
              </RequireAuth>
            }
          />

          {/* ================= DIGITAL ================= */}
          <Route
            path="/digital/mobile"
            element={
              <RequireAuth>
                <DigitalMobile />
              </RequireAuth>
            }
          />
          <Route
            path="/digital/qr"
            element={
              <RequireAuth>
                <DigitalQR />
              </RequireAuth>
            }
          />
          <Route
            path="/digital/wallet"
            element={
              <RequireAuth>
                <DigitalWallet />
              </RequireAuth>
            }
          />

          {/* ================= AI / SUPPORT ================= */}
          <Route
            path="/goals"
            element={
              <RequireAuth>
                <Goals />
              </RequireAuth>
            }
          />
          <Route
            path="/ocr"
            element={
              <RequireAuth>
                <OCRAnalyzer />
              </RequireAuth>
            }
          />
          <Route
            path="/support"
            element={
              <RequireAuth>
                <Support />
              </RequireAuth>
            }
          />

          {/* ================= SAFE FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
