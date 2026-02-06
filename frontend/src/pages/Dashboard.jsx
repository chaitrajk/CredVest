import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Form,
} from "react-bootstrap";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import socket from "../lib/socket";

export default function Dashboard() {
  const [data, setData] = useState({
    balance: 0,
    totalCredit: 0,
    totalDebit: 0,
    transactions: [],
  });
  const [holdings, setHoldings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingLoans, setLoadingLoans] = useState(true);

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeNotes, setIncomeNotes] = useState("");
  const [savingIncome, setSavingIncome] = useState(false);
  const [incomeError, setIncomeError] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token") || null;

  const fmtINR = (v) =>
    "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  function safeGetLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
        return JSON.parse(raw);
      }
      return raw;
    } catch {
      return localStorage.getItem(key);
    }
  }

  function decodeJwtPayload(tok) {
    if (!tok) return null;
    try {
      const base64 = tok.split(".")[1];
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  function getUserIdFallback() {
    const rawUser = safeGetLocal("user");
    if (rawUser) {
      if (rawUser.id) return rawUser.id;
      if (rawUser._id) return rawUser._id;
    }

    const stored = localStorage.getItem("userId");
    if (stored) return stored;

    const tok = localStorage.getItem("token");
    const payload = decodeJwtPayload(tok);
    if (payload) return payload.id || payload.sub || payload.userId;

    return null;
  }

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/dashboard");

      setData({
        balance: res.data.balance || 0,
        totalCredit: res.data.totalCredit || 0,
        totalDebit: res.data.totalDebit || 0,
        transactions: res.data.transactions || [],
      });

      setError("");
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboard();

    socket.on("balanceUpdated", (d) => {
      setData((prev) => ({ ...prev, balance: d.newBalance }));
    });

    socket.on("dashboard:refresh", fetchDashboard);

    return () => {
      socket.off("balanceUpdated");
      socket.off("dashboard:refresh");
    };
  }, [token]);

  useEffect(() => {
    const loadHoldings = async () => {
      try {
        setLoadingHoldings(true);
        const res = await api.get("/api/investments/holdings");
        setHoldings(res.data.holdings || []);
      } catch (err) {
        console.error("Holdings error:", err);
      } finally {
        setLoadingHoldings(false);
      }
    };
    if (token) loadHoldings();
  }, [token]);

  useEffect(() => {
    const loadLoans = async () => {
      try {
        setLoadingLoans(true);
        const res = await api.get("/api/loan");
        setLoans(res.data.loans || []);
      } catch (err) {
        console.error("Loan load error:", err);
      } finally {
        setLoadingLoans(false);
      }
    };
    if (token) loadLoans();
  }, [token]);

  const handleTransfer = () => navigate("/banking/transfer");
  const handleInternational = () => navigate("/banking/international");
  const handleBills = () => navigate("/ocr");
  const handleInvest = () => navigate("/investments");
  const handleCredit = () => navigate("/credit/cards");
  const handleMobile = () => navigate("/digital/mobile");

  const openIncomeModal = () => {
    setIncomeSource("");
    setIncomeAmount("");
    setIncomeDate("");
    setIncomeNotes("");
    setIncomeError("");
    setShowIncomeModal(true);
  };

  const submitIncome = async () => {
    const userId = getUserIdFallback();
    if (!userId) {
      setIncomeError("User ID missing.");
      return;
    }
    if (!incomeAmount || isNaN(Number(incomeAmount))) {
      setIncomeError("Enter a valid amount.");
      return;
    }

    setSavingIncome(true);
    setIncomeError("");

    try {
      await api.post("/api/income/create", {
        userId,
        amount: Number(incomeAmount),
        source: incomeSource || "Miscellaneous",
        description: incomeNotes || "",
        date: incomeDate || undefined,
      });

      await fetchDashboard();
      setShowIncomeModal(false);
    } catch (err) {
      console.error("Add income error:", err);
      setIncomeError("Server error.");
    } finally {
      setSavingIncome(false);
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    const userId = getUserIdFallback();
    if (!userId) return;
    if (!confirm("Delete this income record?")) return;

    try {
      await api.post("/api/income/delete", { userId, incomeId });
      await fetchDashboard();
    } catch {
      alert("Delete failed");
    }
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: "1300px" }}>
      <h3 className="fw-bold text-primary mb-2">👋 Welcome, CredVest User!</h3>
      <p className="text-muted mb-4">Manage everything from one place.</p>

      {/* Summary cards */}
      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="shadow-sm border-0 text-white" style={{ background: "#007bff" }}>
            <Card.Body>
              <Card.Title>Account Balance</Card.Title>
              <h3>{fmtINR(data.balance)}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-white" style={{ background: "#28a745" }}>
            <Card.Body>
              <Card.Title>Total Income</Card.Title>
              <h3>{fmtINR(data.totalCredit)}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-white" style={{ background: "#dc3545" }}>
            <Card.Body>
              <Card.Title>Total Expenses</Card.Title>
              <h3>{fmtINR(data.totalDebit)}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Buttons */}
      <div className="d-flex flex-wrap gap-3 mb-5">
        <Button variant="primary" onClick={handleTransfer}>🪙 Transfer</Button>
        <Button variant="primary" onClick={handleInternational}>🌍 International</Button>
        <Button variant="primary" onClick={handleBills}>📄 Bills</Button>
        <Button variant="primary" onClick={handleInvest}>📈 Invest</Button>
        <Button variant="primary" onClick={handleCredit}>💳 Credit</Button>
        <Button variant="primary" onClick={handleMobile}>📱 Mobile</Button>
        <Button variant="success" onClick={openIncomeModal}>💰 Add Income</Button>
      </div>

      {/* Recent Transactions */}
      <Card className="mb-4 shadow-sm border-0">
        <Card.Header className="bg-light fw-semibold">Recent Transactions</Card.Header>
        <Card.Body>
          {loading ? (
            <p>Loading...</p>
          ) : data.transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <>
              <ul className="list-unstyled">
                {data.transactions.map((t) => {
                  const isCredit = (t.type || "").toLowerCase() === "credit";
                  return (
                    <li key={t._id} className="d-flex justify-content-between py-2 border-bottom">
                      <span>{t.category}</span>
                      <span className={isCredit ? "text-success" : "text-danger"}>
                        {isCredit ? "+" : "-"} {fmtINR(t.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* ⭐ FIXED: correct route */}
              <div className="text-center mt-3">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => navigate("/transactions")}
                >
                  View All Transactions
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Investment Holdings */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-success text-white fw-semibold">Investment Holdings</Card.Header>
        <Card.Body>
          {loadingHoldings ? (
            <p>Loading investments...</p>
          ) : holdings.length === 0 ? (
            <p>No investments found.</p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Units</th>
                  <th>Avg Buy</th>
                  <th>Current</th>
                  <th>Value</th>
                  <th>Gain</th>
                  <th>Returns %</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => (
                  <tr key={i}>
                    <td>{h.symbol}</td>
                    <td>{h.instrumentType}</td>
                    <td>{h.quantity}</td>
                    <td>₹{h.avgBuy}</td>
                    <td>₹{h.currentPrice}</td>
                    <td>₹{h.currentValue}</td>
                    <td className={h.gain >= 0 ? "text-success" : "text-danger"}>
                      {h.gain >= 0 ? "+" : "-"}₹{Math.abs(h.gain)}
                    </td>
                    <td className={h.ret >= 0 ? "text-success" : "text-danger"}>
                      {h.ret >= 0 ? "+" : "-"}
                      {Math.abs(h.ret)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {/* ⭐ FIXED: correct portfolio route */}
          <div className="text-center mt-3">
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => navigate("/investments/portfolio")}
            >
              View Full Portfolio
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Loans */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-light fw-semibold">Your Loan Applications</Card.Header>
        <Card.Body>
          {loadingLoans ? (
            <p>Loading...</p>
          ) : loans.length === 0 ? (
            <div className="text-center">
              <p>No loans yet.</p>
              <Button onClick={() => navigate("/credit/loans")}>
                Apply for Loan
              </Button>
            </div>
          ) : (
            <Table responsive>
              <thead>
                <tr>
                  <th>Loan Type</th>
                  <th>Principal</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Interest</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l._id}>
                    <td>{l.loanType}</td>
                    <td>{fmtINR(l.principalAmount)}</td>
                    <td>{fmtINR(l.remainingAmount)}</td>
                    <td>
                      <span
                        className={`badge ${
                          l.status === "active" ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td>{l.interestRate}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Income Modal */}
      <Modal show={showIncomeModal} onHide={() => setShowIncomeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Income</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Source</Form.Label>
              <Form.Control
                type="text"
                placeholder="Salary, Freelance, Gift..."
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                placeholder="Amount"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Optional note"
                value={incomeNotes}
                onChange={(e) => setIncomeNotes(e.target.value)}
              />
            </Form.Group>

            {incomeError && <div className="text-danger">{incomeError}</div>}
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowIncomeModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={submitIncome} disabled={savingIncome}>
            {savingIncome ? "Saving..." : "Add Income"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
