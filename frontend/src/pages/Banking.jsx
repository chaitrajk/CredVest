import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";

export default function Banking() {
  return (
    <Container fluid className="py-4">
      <h2 className="fw-bold text-primary mb-4">Banking Overview</h2>
      <Row className="g-4">
        <Col md={4}>
          <Card className="shadow-sm border-0 text-white" style={{ background: "#007bff" }}>
            <Card.Body>
              <Card.Title>Checking Account</Card.Title>
              <h3>₹1,25,400</h3>
              <Card.Text>Active balance with instant transfers</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-white" style={{ background: "#17a2b8" }}>
            <Card.Body>
              <Card.Title>Savings Account</Card.Title>
              <h3>₹2,80,000</h3>
              <Card.Text>4.2% annual interest</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-white" style={{ background: "#28a745" }}>
            <Card.Body>
              <Card.Title>Credit Card</Card.Title>
              <h3>₹1,00,000</h3>
              <Card.Text>Available: ₹72,000</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mt-5 shadow-sm border-0">
        <Card.Body>
          <Card.Title className="fw-semibold text-secondary">Transactions</Card.Title>
          <Card.Text className="text-muted">
            Recent transactions, transfers, and bill payments will appear here.
          </Card.Text>
        </Card.Body>
      </Card>
    </Container>
  );
}
