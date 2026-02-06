import React, { useEffect, useState, useRef } from "react";
import { Container, Row, Col, Card, Table, Button } from "react-bootstrap";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InvestPortfolio() {
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState({});
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const holdingsRef = useRef(null);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const res = await axios.get(`${API}/api/investments/holdings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHoldings(res.data.holdings || []);
        setSummary(res.data.summary || {});
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchHoldings();
  }, [token]);

  const formatINR = (n) =>
    "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
      <motion.h3 className="fw-bold mb-4 text-primary">
        📊 Investment Portfolio Overview
      </motion.h3>

      {/* TOP METRICS */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm border-0 text-white bg-primary">
            <Card.Body>
              <Card.Title>Total Portfolio Value</Card.Title>
              <h2>{formatINR(summary.totalValue)}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-white bg-success">
            <Card.Body>
              <Card.Title>Total Gain / Loss</Card.Title>
              <h2>{formatINR(summary.totalGain)}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border-0 text-white bg-info">
            <Card.Body>
              <Card.Title>Portfolio Return</Card.Title>
              <h2>{Number(summary.totalReturn || 0).toFixed(2)}%</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* HOLDINGS TABLE */}
      <motion.div ref={holdingsRef} variants={fadeUp} initial="hidden" animate="show">
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-success text-white fw-semibold">
            💼 Investment Holdings
          </Card.Header>
          <Card.Body>
            {holdings.length === 0 ? (
              <p className="text-muted">No investments yet.</p>
            ) : (
              <Table hover responsive>
                <thead>
                  <tr>
                    <th>Investment</th>
                    <th>Type</th>
                    <th>Units</th>
                    <th>Buy Price</th>
                    <th>Current Price</th>
                    <th>Total Value</th>
                    <th>Gain / Loss</th>
                    <th>Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={i}>
                      <td><strong>{h.symbol}</strong></td>
                      <td>{h.instrumentType}</td>
                      <td>{h.quantity}</td>
                      <td>{formatINR(h.avgBuy)}</td>
                      <td>{formatINR(h.currentPrice)}</td>
                      <td>{formatINR(h.currentValue)}</td>
                      <td className={h.gain >= 0 ? "text-success" : "text-danger"}>
                        {formatINR(h.gain)}
                      </td>
                      <td className={h.ret >= 0 ? "text-success" : "text-danger"}>
                        {Number(h.ret || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </motion.div>

      {/* ACTION BUTTONS */}
      <Row>
        <Col md={6}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="fw-semibold">💰 Investment Actions</Card.Header>
            <Card.Body className="d-grid gap-2">
              <Button onClick={() => navigate("/investments/buy")}>
                ➕ Add Investment
              </Button>
              <Button variant="success" onClick={() => navigate("/investments/sell")}>
                ➖ Withdraw Investment
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  alert("Transfer feature can be added in future versions.")
                }
              >
                🔁 Transfer Investments
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="fw-semibold">📈 Portfolio Analysis</Card.Header>
            <Card.Body className="d-grid gap-2">
              <Button
                variant="info"
                onClick={() =>
                  holdingsRef.current?.scrollIntoView({ behavior: "smooth" })
                }
              >
                📊 Asset Allocation
              </Button>
              <Button
                variant="warning"
                onClick={() => navigate("/investments/stocks")}
              >
                📉 Performance History
              </Button>
              <Button
                variant="dark"
                onClick={() =>
                  alert("Tax report generation can be implemented as PDF.")
                }
              >
                📄 Tax Documents
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
