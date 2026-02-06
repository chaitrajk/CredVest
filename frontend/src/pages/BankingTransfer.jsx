import React, { useState, useEffect } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function BankingTransfer() {
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [balance, setBalance] = useState(null);      // 🔥 REAL BALANCE
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  // ------------------------------------------------------
  // 🔥 FETCH REAL BALANCE FROM BACKEND
  // ------------------------------------------------------
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const res = await api.get("/api/dashboard");
        setBalance(res.data.balance || 0);
      } catch (e) {
        console.error("Balance load error:", e);
        setBalance(0);
      }
    };
    loadBalance();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (balance === null) return setErr("Balance not loaded yet.");
    if (!account.trim()) return setErr("Recipient account is required.");

    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) return setErr("Enter a valid amount.");

    if (amt > balance) return setErr("Insufficient balance.");

    setLoading(true);
    try {
      const payload = {
        toAccount: account.trim(),
        amount: amt,
        description: description.trim(),
      };

      await api.post("/api/transactions/transfer", payload);

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);

      navigate("/dashboard");
    } catch (e) {
      console.error("Transfer error:", e);
      setErr(e?.response?.data?.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: "700px" }}>
      <h2 className="fw-bold text-primary mb-4">💸 Fund Transfer</h2>

      <Card className="shadow-sm border-0">
        <Card.Header className="text-white fw-semibold" style={{ background: "#007bff" }}>
          Fund Transfer
        </Card.Header>
        <Card.Body>

          {/* 🔥 SHOW REAL BALANCE */}
          <Alert variant="info">
            <strong>Available Balance:</strong>{" "}
            ₹{balance !== null ? balance.toLocaleString("en-IN") : "Loading..."}
          </Alert>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Recipient Account Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter account number"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                disabled={loading}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Transfer Amount</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Optional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </Form.Group>

            {err && <Alert variant="danger">{err}</Alert>}

            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? "Sending..." : "🚀 Send Transfer"}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {submitted && (
        <Alert variant="success" className="mt-3 text-center fw-semibold">
          ✅ Transfer of ₹{amount} sent successfully!
        </Alert>
      )}
    </Container>
  );
}
