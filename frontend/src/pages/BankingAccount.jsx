import React, { useEffect, useState } from "react";
import { Card, Row, Col, Badge, Spinner } from "react-bootstrap";
import api from "../lib/api";

export default function BankingAccount() {
  const [acct, setAcct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get("/api/account/me");
        // defensive: ensure shape is what we expect
        // expected res.data.account = { name, accountNumber, type, ifsc, branch, balance, openedOn, status }
        if (!cancelled) {
          if (res && res.data) {
            setAcct(res.data.account ?? null);
            // If account is null, we still set it to null so UI shows the 'no account' message
          } else {
            console.warn("Unexpected /api/account/me response:", res);
            setErr("Unexpected server response");
            setAcct(null);
          }
        }
      } catch (e) {
        console.error("Failed loading account:", e, e?.response?.data);
        if (!cancelled) {
          setErr(
            e?.response?.data?.message ||
              e?.message ||
              "Unable to load account details."
          );
          setAcct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Loading State
  if (loading) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body className="d-flex align-items-center">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Loading account…</span>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (err) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body>
          <p className="text-danger mb-1">Error: {err}</p>
          <small className="text-muted">
            Check the backend logs or open the Network tab and inspect the
            response for <code>/api/account/me</code>.
          </small>
        </Card.Body>
      </Card>
    );
  }

  // No account created yet
  if (!acct) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body>
          <h5 className="mb-2">No account found</h5>
          <p className="text-muted small mb-2">
            You don't have an account yet. Create one from the Banking section.
          </p>
          <small className="text-muted">
            Server response was valid but returned no account object.
          </small>
        </Card.Body>
      </Card>
    );
  }

  // All good — show account (use optional chaining to be extra safe)
  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="d-flex justify-content-between align-items-center bg-white">
        <div>
          <div className="text-muted small">Primary Account</div>
          <h5 className="mb-0">{acct?.name ?? "Account Holder"}</h5>
        </div>
        <Badge bg={acct?.status === "ACTIVE" ? "success" : "secondary"}>
          {acct?.status ?? "UNKNOWN"}
        </Badge>
      </Card.Header>

      <Card.Body>
        <Row className="mb-3">
          <Col xs={6}>
            <div className="text-muted small">Account Number</div>
            <div className="fw-semibold">{acct?.accountNumber ?? "—"}</div>
          </Col>
          <Col xs={6}>
            <div className="text-muted small">Account Type</div>
            <div className="fw-semibold">{acct?.type ?? "—"}</div>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col xs={6}>
            <div className="text-muted small">IFSC</div>
            <div className="fw-semibold">{acct?.ifsc ?? "—"}</div>
          </Col>
          <Col xs={6}>
            <div className="text-muted small">Branch</div>
            <div className="fw-semibold">{acct?.branch ?? "—"}</div>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col xs={6}>
            <div className="text-muted small">Available Balance</div>
            <div className="fw-bold">
              ₹{Number(acct?.balance ?? 0).toLocaleString("en-IN")}
            </div>
          </Col>
          <Col xs={6}>
            <div className="text-muted small">Opened On</div>
            <div className="fw-semibold">
              {acct?.openedOn
                ? new Date(acct.openedOn).toLocaleDateString("en-IN")
                : "—"}
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
