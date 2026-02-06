// frontend/src/pages/CreditCards.jsx
import React, { useEffect, useState } from "react";
import { Card, Button, Table, ProgressBar, Spinner, Alert } from "react-bootstrap";
import api from "../lib/api";

export default function CreditCards() {
  const [card, setCard] = useState(null);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fmtINR = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

  const loadData = async () => {
    try {
      const res = await api.get("/api/credit/cards");
      setCard(res.data.card);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePay = async () => {
    const amount = prompt("Enter payment amount (₹):");
    if (!amount) return;
    try {
      const res = await api.post("/api/credit/cards/pay", {
        amount: Number(amount),
      });
      setMsg(`✅ Payment successful. Remaining Balance: ₹${res.data.balance}`);
      loadData();
    } catch (e) {
      alert("Payment failed!");
    }
  };

  const handleViewStatements = async () => {
    try {
      const res = await api.get("/api/credit/cards/statements");
      setStatements(res.data.statements || []);
      setMsg("");
    } catch (e) {
      alert("Could not fetch statements");
    }
  };

  const handleManage = async () => {
    try {
      await api.post("/api/credit/cards/settings");
      alert("✅ Card settings updated successfully!");
    } catch {
      alert("Failed to update settings.");
    }
  };

  if (loading) return <Spinner animation="border" className="mt-5" />;

  if (!card)
    return (
      <Alert variant="danger" className="mt-4">
        No credit card data found.
      </Alert>
    );

  const utilization = Math.round((card.balance / card.creditLimit) * 100);

  return (
    <div className="p-4">
      <h2 className="text-center fw-bold text-primary mb-4">
        Credit Card Management
      </h2>

      {msg && <Alert variant="success">{msg}</Alert>}

      <div className="d-flex justify-content-center flex-wrap mb-4 gap-3">
        <Button variant="primary" onClick={handlePay}>
          ₹ Pay Now
        </Button>
        <Button variant="info" onClick={handleViewStatements}>
          View Statements
        </Button>
        <Button variant="secondary" onClick={handleManage}>
          Manage
        </Button>
      </div>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-light fw-semibold">
          💳 Credit Card Details
        </Card.Header>
        <Card.Body>
          <Table bordered hover>
            <thead>
              <tr>
                <th>Card Type</th>
                <th>Credit Limit</th>
                <th>Current Balance</th>
                <th>Available Credit</th>
                <th>Interest Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{card.type}</td>
                <td>{fmtINR(card.creditLimit)}</td>
                <td className="text-danger">{fmtINR(card.balance)}</td>
                <td className="text-success">{fmtINR(card.availableCredit)}</td>
                <td>{card.interestRate}%</td>
                <td>
                  <span className="badge bg-success">{card.status}</span>
                </td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-light fw-semibold">
          📊 Credit Information
        </Card.Header>
        <Card.Body>
          <p>
            Credit Score: <strong>{card.creditScore}</strong>{" "}
            <span className="text-success">(Excellent)</span>
          </p>
          <p>Last updated: {card.lastUpdated}</p>
          <p>Credit Utilization:</p>
          <ProgressBar now={utilization} label={`${utilization}%`} />
          <small>
            {utilization <= 30
              ? "Good utilization"
              : "High utilization, try reducing balance"}
          </small>
          <hr />
          <p>Credit Age: {card.creditAge}</p>
          <p>Payment History: 100% on-time payments</p>
        </Card.Body>
      </Card>

      {statements.length > 0 && (
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-info text-white fw-semibold">
            📜 Recent Statements
          </Card.Header>
          <Card.Body>
            <Table bordered>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s, i) => (
                  <tr key={i}>
                    <td>{s.date}</td>
                    <td>{s.description}</td>
                    <td
                      className={
                        s.amount < 0 ? "text-danger" : "text-success"
                      }
                    >
                      {s.amount < 0 ? "−" : "+"}
                      {fmtINR(Math.abs(s.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
