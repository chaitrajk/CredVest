import React, { useState, useEffect } from "react";
import { Container, Card, Button, Form, Spinner } from "react-bootstrap";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function DigitalWallet() {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const getBalance = async () => {
    try {
      const res = await axios.get(`${API}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(res.data.balance || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const topUp = async () => {
    if (!amount) return alert("Enter amount");
    try {
      setLoading(true);
      await axios.post(
        `${API}/api/transactions/action`,
        { category: "Digital Wallet", description: "Wallet Top-Up", amount, type: "debit" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Wallet topped up!");
      setAmount("");
      getBalance();
    } catch (err) {
      alert("❌ Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) getBalance();
  }, [token]);

  return (
    <Container className="py-4" style={{ maxWidth: "600px" }}>
      <h2 className="fw-bold text-primary mb-4">💳 Digital Wallet</h2>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <h4>Wallet Balance: ₹{balance.toLocaleString()}</h4>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Amount to Add (₹)</Form.Label>
            <Form.Control
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Form.Group>
          <Button variant="primary" className="w-100" onClick={topUp} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Add Money"}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

