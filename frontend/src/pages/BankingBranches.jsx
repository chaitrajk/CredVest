import React from "react";
import { Container, Row, Col, Card, Button, ListGroup } from "react-bootstrap";

export default function BankingBranches() {
  const branches = [
    {
      name: "Main Street Branch",
      type: "Branch",
      address: "100 Main St, Downtown",
      phone: "555-0100",
      hours: "Mon-Fri: 9AM-5PM, Sat: 9AM-2PM",
      color: "#0d6efd",
    },
    {
      name: "Downtown ATM",
      type: "ATM",
      address: "200 Commerce Ave",
      phone: "",
      hours: "24/7",
      color: "#6c757d",
    },
    {
      name: "Westside Branch",
      type: "Branch",
      address: "300 West Blvd",
      phone: "555-0200",
      hours: "Mon-Fri: 9AM-5PM",
      color: "#0d6efd",
    },
  ];

  return (
    <Container className="py-4">
      <h2 className="fw-bold text-primary mb-4">Branch & ATM Locations</h2>

      <Row className="g-4">
        {branches.map((b, i) => (
          <Col md={4} key={i}>
            <Card className="shadow-sm border-0">
              <Card.Header
                className="text-white fw-semibold"
                style={{ backgroundColor: b.color }}
              >
                <i className="bi bi-geo-alt-fill me-2"></i>
                {b.name}
              </Card.Header>
              <Card.Body>
                <p>
                  <strong>Type:</strong>{" "}
                  <span
                    className={`badge ${
                      b.type === "Branch" ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    {b.type}
                  </span>
                </p>
                <p>
                  <strong>Address:</strong> {b.address}
                </p>
                {b.phone && (
                  <p>
                    <strong>Phone:</strong> {b.phone}
                  </p>
                )}
                <p>
                  <strong>Hours:</strong> {b.hours}
                </p>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => alert(`Opening map for ${b.name}`)}
                  >
                    📍 Get Directions
                  </Button>
                  {b.type === "Branch" && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => alert(`Scheduling appointment at ${b.name}`)}
                    >
                      🗓 Schedule Appointment
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="mt-4 border-0 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6 className="fw-semibold mb-2">🏦 Branch Services</h6>
              <ListGroup variant="flush" className="small text-muted">
                <ListGroup.Item>✔ Personal banking</ListGroup.Item>
                <ListGroup.Item>✔ Business accounts</ListGroup.Item>
                <ListGroup.Item>✔ Loan applications</ListGroup.Item>
                <ListGroup.Item>✔ Investment services</ListGroup.Item>
                <ListGroup.Item>✔ Notary services</ListGroup.Item>
              </ListGroup>
            </Col>

            <Col md={6}>
              <h6 className="fw-semibold mb-2">💳 ATM Services</h6>
              <ListGroup variant="flush" className="small text-muted">
                <ListGroup.Item>✔ Cash withdrawals</ListGroup.Item>
                <ListGroup.Item>✔ Balance inquiries</ListGroup.Item>
                <ListGroup.Item>✔ Deposits</ListGroup.Item>
                <ListGroup.Item>✔ Transfer funds</ListGroup.Item>
                <ListGroup.Item>✔ 24/7 access</ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}
