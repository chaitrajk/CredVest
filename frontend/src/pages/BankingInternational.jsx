import React, { useState } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Alert,
  ListGroup,
} from "react-bootstrap";

export default function BankingInternational() {
  const [form, setForm] = useState({
    name: "",
    bank: "",
    account: "",
    currency: "",
    amount: "",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const availableBalance = 1543250; // ₹15,43,250.00

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.name && form.bank && form.account && form.amount) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    }
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
      <h2 className="fw-bold text-primary mb-4">🌍 International Transfer</h2>
      <Row>
        {/* LEFT COLUMN */}
        <Col md={8}>
          <Card className="shadow-sm border-0">
            <Card.Header
              className="text-dark fw-semibold"
              style={{ background: "#ffc107" }}
            >
              International Transfer
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="py-2">
                <strong>Available Balance:</strong> ₹
                {availableBalance.toLocaleString("en-IN")}
              </Alert>

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Recipient Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="Full name of recipient"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Recipient Bank</Form.Label>
                      <Form.Control
                        type="text"
                        name="bank"
                        placeholder="Bank name"
                        value={form.bank}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Recipient Account</Form.Label>
                      <Form.Control
                        type="text"
                        name="account"
                        placeholder="Account number or IBAN"
                        value={form.account}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select
                        name="currency"
                        value={form.currency}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select currency</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="JPY">JPY (¥)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control
                    type="number"
                    name="amount"
                    placeholder="Enter amount"
                    min="10"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    required
                  />
                  <Form.Text className="text-muted">
                    Minimum: ₹10.00 or equivalent in selected currency
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    name="description"
                    placeholder="e.g., Family support, business payment"
                    value={form.description}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="warning"
                  className="w-100 text-dark fw-semibold"
                >
                  ✈️ Send International Transfer
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {submitted && (
            <Alert variant="success" className="mt-3 text-center fw-semibold">
              ✅ ₹{form.amount} {form.currency} sent successfully to{" "}
              {form.name} ({form.bank})
            </Alert>
          )}

          {/* Info Section */}
          <Card className="mt-4 border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="fw-semibold text-primary">
                ℹ️ International Transfer Information
              </Card.Title>
              <ListGroup variant="flush" className="mt-2">
                <ListGroup.Item>
                  ✅ Processing Time: 1–5 business days
                </ListGroup.Item>
                <ListGroup.Item>
                  💱 Fees: ₹500 (&lt; $1000) / ₹1000 (&gt; $1000)
                </ListGroup.Item>
                <ListGroup.Item>
                  💬 Competitive exchange rates, no hidden charges
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* RIGHT COLUMN */}
        <Col md={4}>
          <Card className="shadow-sm border-0">
            <Card.Header
              className="text-white fw-semibold"
              style={{ background: "#0dcaf0" }}
            >
              🌐 Supported Countries
            </Card.Header>
            <Card.Body>
              <h6 className="fw-bold text-secondary">Europe</h6>
              <p>Germany, France, UK, Italy, Spain, Netherlands, Sweden</p>

              <h6 className="fw-bold text-secondary">Asia Pacific</h6>
              <p>Japan, Australia, Singapore, Hong Kong, South Korea, India</p>

              <h6 className="fw-bold text-secondary">Americas</h6>
              <p>Canada, USA, Mexico, Brazil, Argentina, Chile</p>

              <h6 className="fw-bold text-secondary">Other Regions</h6>
              <p>South Africa, UAE, Israel, and 50+ more</p>

              <div className="d-grid gap-2 mt-4">
                <Button variant="outline-primary" size="sm">
                  📞 Call Support
                </Button>
                <Button variant="outline-success" size="sm">
                  💬 Live Chat
                </Button>
                <Button variant="outline-warning" size="sm">
                  📘 Transfer Guide
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
