import React, { useEffect, useState } from "react";
import { Container, Card, Spinner } from "react-bootstrap";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function CreditScore() {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await axios.get(`${API}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // You can replace this formula later with real API (Experian/CRIF)
        const val = 700 + Math.floor((res.data.balance || 0) / 10000);
        setScore(Math.min(val, 850));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, [token]);

  return (
    <Container className="py-4" style={{ maxWidth: "600px" }}>
      <h2 className="fw-bold text-primary mb-4">📈 Credit Score</h2>

      <Card className="shadow-sm border-0 text-center py-5">
        {loading ? (
          <Spinner animation="border" />
        ) : (
          <>
            <h3>Your Estimated Credit Score</h3>
            <h1 className="display-3 fw-bold text-success mt-3">{score}</h1>
            <p className="text-muted mt-2">
              Based on account balance and transaction activity.
            </p>
          </>
        )}
      </Card>
    </Container>
  );
}

