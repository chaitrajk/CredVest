import React, { useState, useEffect } from "react";
import { Container, Card, Form, Button, Table, Spinner } from "react-bootstrap";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function Expenses() {
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Food");
  const [amount, setAmount] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const fetchExpenses = async () => {
    try {
      // ✅ FIXED — removed double /api
      const res = await axios.get(`${API}/transactions/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addExpense = async () => {
    if (!amount) return alert("Enter amount");
    try {
      setLoading(true);

      // ✅ FIXED — removed double /api
      await axios.post(
        `${API}/transactions/action`,
        {
          category: cat,
          description: desc || cat,
          amount: Number(amount),
          type: "debit",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("✅ Expense saved!");
      setDesc("");
      setAmount("");
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchExpenses();
  }, [token]);

  return (
    <Container className="py-4" style={{ maxWidth: "900px" }}>
      <h2 className="fw-bold text-primary mb-4">💰 Expense Tracker</h2>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Form className="row g-3">
            <div className="col-md-4">
              <Form.Label>Category</Form.Label>
              <Form.Select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option>Food</option>
                <option>Shopping</option>
                <option>Rent</option>
                <option>Utilities</option>
                <option>Others</option>
              </Form.Select>
            </div>

            <div className="col-md-4">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g., Zomato Order"
              />
            </div>

            <div className="col-md-2">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <Button
                variant="primary"
                onClick={addExpense}
                disabled={loading}
                className="w-100"
              >
                {loading ? <Spinner size="sm" /> : "Add"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-light fw-semibold">
          Recent Expenses
        </Card.Header>
        <Card.Body>
          {list.length === 0 ? (
            <p className="text-muted mb-0">No expenses found.</p>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-end">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 10).map((t) => (
                  <tr key={t._id}>
                    <td>{t.date?.slice(0, 10)}</td>
                    <td>{t.category}</td>
                    <td>{t.description}</td>
                    <td className="text-end text-danger">
                      −₹{Number(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
