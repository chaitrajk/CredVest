import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InvestHoldings() {
  const [summary, setSummary] = useState({ stocks: 0, funds: 0, bonds: 0 });
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const res = await axios.get(`${API}/api/investments/holdings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const holdings = res.data.holdings || [];
        const s = { stocks: 0, funds: 0, bonds: 0 };

        holdings.forEach(h => {
          if (h.instrumentType?.toLowerCase().includes("stock")) s.stocks += h.currentValue;
          else if (h.instrumentType?.toLowerCase().includes("fund")) s.funds += h.currentValue;
          else s.bonds += h.currentValue;
        });

        setSummary(s);
      } catch (err) {
        console.error(err);
      }
    };

    if (token) fetchHoldings();
  }, [token]);

  const fmt = v => "₹" + Number(v || 0).toLocaleString("en-IN");

  return (
    <Container className="py-4">
      <Row>
        <Col><Card><Card.Body>Stocks: {fmt(summary.stocks)}</Card.Body></Card></Col>
        <Col><Card><Card.Body>Funds: {fmt(summary.funds)}</Card.Body></Card></Col>
        <Col><Card><Card.Body>Bonds: {fmt(summary.bonds)}</Card.Body></Card></Col>
      </Row>
    </Container>
  );
}
