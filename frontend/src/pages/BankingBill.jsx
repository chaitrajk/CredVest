import React, { useState, useEffect } from "react";
import { Container, Card, Form, Button, Row, Col, Alert } from "react-bootstrap";
import api from "../lib/api";

export default function BankingBill() {
  const [billType, setBillType] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");
  const [balance, setBalance] = useState(null); // 🔥 REAL BALANCE

  // ------------------------------------------------------
  // 🔥 FETCH BALANCE FROM BACKEND
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");

    if (!billType) return setErr("Please select a bill type.");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setErr("Enter a valid amount.");

    if (balance !== null && amt > balance)
      return setErr("Insufficient balance.");

    // Payment success message only (you can later connect backend)
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <Container className="py-4">
      <h2 className="fw-bold text-primary mb-4">Bill Payment</h2>

      <Card className="shadow-sm border-0">
        <Card.Header
          className="text-white"
          style={{ backgroundColor: "#198754", fontWeight: "600" }}
        >
          <i className="bi bi-receipt"></i> Bill Payment
        </Card.Header>

        <Card.Body>
          {/* 🔥 REAL BALANCE */}
          <Alert variant="info" className="py-2 mb-4 text-center fw-semibold">
            <strong>Available Balance: </strong>
            ₹{balance !== null ? balance.toLocaleString("en-IN") : "Loading..."}
          </Alert>

          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>Bill Type</Form.Label>
                <Form.Select
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                >
                  <option value="">Select bill type</option>
                  <option>Electricity</option>
                  <option>Water</option>
                  <option>Internet</option>
                  <option>Mobile Recharge</option>
                  <option>Credit Card</option>
                </Form.Select>
              </Form.Group>

              <Form.Group as={Col} md="6">
                <Form.Label>Payment Amount</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="₹0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Form.Group>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <Form.Text muted>Optional</Form.Text>
            </Form.Group>

            {err && <Alert variant="danger">{err}</Alert>}

            <Button
              type="submit"
              className="w-100 fw-semibold"
              style={{ backgroundColor: "#198754", border: "none" }}
            >
              Pay Bill
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="mt-4 border-0 shadow-sm">
        <Card.Body>
          <h6 className="fw-semibold mb-2">Bill Payment Information</h6>
          <ul className="mb-0 small text-muted">
            <li>Payments are processed immediately.</li>
            <li>Secure payment processing.</li>
            <li>Payment confirmation provided.</li>
            <li>Due date reminders available.</li>
          </ul>
        </Card.Body>
      </Card>

      {submitted && (
        <Alert variant="success" className="mt-4 text-center fw-semibold">
          ✅ Payment of ₹{amount} for {billType} bill has been processed successfully!
        </Alert>
      )}
    </Container>
  );
}
