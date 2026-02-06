import React, { useState } from "react";
import { Container, Card, Form, Button, Row, Col, Spinner } from "react-bootstrap";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function Credit() {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const handlePayment = async (category, type = "debit") => {
    if (!amount) return alert("Enter amount");
    try {
      setLoading(true);
      await axios.post(
        `${API}/api/transactions/action`,
        { category, description: desc || category, amount: Number(amount), type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Transaction saved!");
      setAmount("");
      setDesc("");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: "700px" }}>
      <h2 className="fw-bold text-primary mb-4">💳 Credit & Loans</h2>

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              type="text"
              placeholder="Credit Card Payment / Loan EMI / etc."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Amount (₹)</Form.Label>
            <Form.Control
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Form.Group>

          <Row>
            <Col>
              <Button
                variant="danger"
                className="w-100"
                disabled={loading}
                onClick={() => handlePayment("Credit Card", "debit")}
              >
                {loading ? "Processing..." : "Pay Credit Card Bill"}
              </Button>
            </Col>
            <Col>
              <Button
                variant="warning"
                className="w-100"
                disabled={loading}
                onClick={() => handlePayment("Loan EMI", "debit")}
              >
                {loading ? "Processing..." : "Pay Loan EMI"}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Button
            variant="success"
            className="w-100"
            disabled={loading}
            onClick={() => handlePayment("Credit Repayment", "credit")}
          >
            {loading ? <Spinner size="sm" /> : "Record Credit Repayment"}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

