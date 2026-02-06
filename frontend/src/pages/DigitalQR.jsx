import React from "react";
import { Container, Card, Button } from "react-bootstrap";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const token = localStorage.getItem("token");

export default function DigitalQR() {
  const handlePay = async (merchant, amt) => {
    try {
      await axios.post(
        `${API}/api/transactions/action`,
        { category: "QR Payment", description: `QR to ${merchant}`, amount: amt, type: "debit" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`✅ Paid ₹${amt} to ${merchant}`);
    } catch (err) {
      alert("❌ Payment failed");
    }
  };

  return (
    <Container className="py-4">
      <h2 className="fw-bold text-primary mb-4">📸 QR Payments</h2>

      <Card className="shadow-sm border-0 text-center">
        <Card.Body>
          <img
            src="https://cdn-icons-png.flaticon.com/512/7124/7124697.png"
            alt="QR Code"
            width="180"
            className="mb-3"
          />
          <h5>Scan and Pay Merchant</h5>
          <p className="text-muted">Instant UPI payment</p>
          <Button variant="success" onClick={() => handlePay("Cafe Latte", 180)}>
            Pay ₹180
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

