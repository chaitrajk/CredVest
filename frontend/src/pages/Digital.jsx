import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const token = localStorage.getItem("token");

async function addTxn(category, description, amount, type = "debit") {
  try {
    await axios.post(
      `${API}/api/transactions/action`,
      { category, description, amount, type },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert("✅ Transaction saved!");
  } catch (err) {
    console.error(err);
    alert("❌ Failed to record transaction");
  }
}

export default function Digital() {
  return (
    <Container className="py-4">
      <h2 className="fw-bold text-primary mb-4">📱 Digital Banking & Payments</h2>

      <Row className="g-4">
        <Col md={4}>
          <Card className="shadow-sm border-0 text-center">
            <Card.Body>
              <Card.Title>Mobile Recharge</Card.Title>
              <p className="text-muted">Quick prepaid/postpaid top-up</p>
              <Button
                variant="success"
                onClick={() => addTxn("Mobile Recharge", "Jio Recharge", 299)}
              >
                Recharge ₹299
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-center">
            <Card.Body>
              <Card.Title>QR Payment</Card.Title>
              <p className="text-muted">Scan & Pay instantly</p>
              <Button
                variant="primary"
                onClick={() => addTxn("QR Payment", "Cafe Payment", 250)}
              >
                Pay ₹250
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-center">
            <Card.Body>
              <Card.Title>Wallet Top-Up</Card.Title>
              <p className="text-muted">Add money to your wallet</p>
              <Button
                variant="warning"
                onClick={() => addTxn("Digital Wallet", "Wallet Top-Up", 500)}
              >
                Add ₹500
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

