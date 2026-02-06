import React, { useState } from "react";
import { Container, Card, Form, Button, Spinner } from "react-bootstrap";
import axios from "axios";

// Backend base URL
const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function CreditLoans() {
  const [loanType, setLoanType] = useState("Home Loan");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const payLoan = async () => {
    if (!amount || Number(amount) <= 0) {
      return alert("Please enter a valid amount");
    }

    if (!token) {
      return alert("User not authenticated. Please log in again.");
    }

    try {
      setLoading(true);

      // FIXED: Removed duplicate /api → Correct endpoint
      await axios.post(
        `${API}/transactions/action`,
        {
          category: loanType,
          description: `${loanType} EMI`,
          amount: Number(amount),
          type: "debit",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("✅ Loan EMI payment recorded successfully");
      setAmount("");
    } catch (err) {
      console.error("Loan Payment Error:", err);
      alert("❌ Failed to record loan EMI payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: "600px" }}>
      <h2 className="fw-bold text-primary mb-4">🏦 Loan Management</h2>

      <Card className="shadow-sm border-0">
        <Card.Body>
          {/* Loan Type */}
          <Form.Group className="mb-3">
            <Form.Label>Select Loan Type</Form.Label>
            <Form.Select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
            >
              <option>Home Loan</option>
              <option>Car Loan</option>
              <option>Personal Loan</option>
              <option>Education Loan</option>
            </Form.Select>
          </Form.Group>

          {/* Amount */}
          <Form.Group className="mb-3">
            <Form.Label>Amount (₹)</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter EMI amount"
            />
          </Form.Group>

          {/* Pay Button */}
          <Button
            variant="success"
            onClick={payLoan}
            disabled={loading}
            className="w-100"
          >
            {loading ? <Spinner size="sm" /> : "Pay Loan EMI"}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
