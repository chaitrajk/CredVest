// frontend/src/pages/Support.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import api, { API_ROOT } from "../lib/api";
import "./Support.css"; // 👈 create this file next

const SUGGESTED_QUESTIONS = [
  "What can CredVest AI Support do for me?",
  "How do I link a new bank account?",
  "Explain my dashboard in simple words.",
  "How can I track my loans and EMIs?",
];

export default function Support() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "ai",
      text: "👋 Hi! I’m CredVest AI Support. Ask me anything — I can help with banking, investments, or general queries.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const pushMessage = (msg) => {
    setMessages((prev) => [...prev, { ...msg, id: Date.now() + Math.random() }]);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput("");

    pushMessage({
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setLoading(true);

    try {
      // Ensure we call the correct backend path (handles cases where backend is mounted under /api)
      const target = `${API_ROOT.replace(/\/+$/, "")}/support/ask`;
      const res = await api.post(target, { message: text });
      const reply =
        res?.data?.reply || "Sorry, I couldn't process that right now. Please try again.";

      pushMessage({
        role: "ai",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } catch (err) {
      console.error("Support AI error (frontend):", err);
      pushMessage({
        role: "ai",
        text: "⚠️ Server not responding. Please try again later.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (q) => {
    setInput(q);
  };

  return (
    <div className="support-page-bg">
      <Container className="py-4 d-flex justify-content-center">
        <div style={{ width: "100%", maxWidth: "960px" }}>
          <h2 className="fw-bold text-center mb-4 support-title">
            💭 CredVest AI Support
          </h2>

          <Card className="shadow-lg border-0 support-card glass-card">
            {/* Header */}
            <Card.Header className="d-flex align-items-center justify-content-between bg-transparent border-0 pb-0">
              <div className="d-flex align-items-center gap-2">
                <div className="support-avatar">
                  <span>🤖</span>
                </div>
                <div>
                  <div className="fw-semibold">CredVest AI Assistant</div>
                  <div className="small text-muted d-flex align-items-center gap-1">
                    <span className="online-dot" />
                    Online · typically replies in seconds
                  </div>
                </div>
              </div>
              <Badge bg="light" text="dark" className="border">
                Beta • GPT-powered
              </Badge>
            </Card.Header>

            {/* Quick suggestions */}
            <Card.Body className="pt-3 pb-0">
              <div className="d-flex flex-wrap gap-2 mb-3">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Card.Body>

            {/* Messages area */}
            <Card.Body className="support-chat-body">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`d-flex mb-3 message-row ${
                    msg.role === "user" ? "justify-content-end" : "justify-content-start"
                  }`}
                >
                  <div
                    className={`chat-bubble ${
                      msg.role === "user" ? "bubble-user" : "bubble-ai"
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="bubble-name">
                        {msg.role === "user" ? "You" : "CredVest AI"}
                      </span>
                      <span className="bubble-time">{msg.time}</span>
                    </div>
                    <div className="bubble-text">{msg.text}</div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="d-flex mb-3 justify-content-start">
                  <div className="chat-bubble bubble-ai">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="bubble-name">CredVest AI</span>
                      <span className="bubble-time">typing…</span>
                    </div>
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </Card.Body>

            {/* Input */}
            <Card.Footer className="bg-transparent border-0 pt-0">
              <Form onSubmit={sendMessage}>
                <Row className="g-2 align-items-center">
                  <Col xs={9} sm={10}>
                    <Form.Control
                      className="chat-input"
                      placeholder="Ask your question..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={loading}
                    />
                  </Col>
                  <Col xs={3} sm={2} className="text-end">
                    <Button
                      type="submit"
                      className="w-100 send-btn"
                      disabled={loading || !input.trim()}
                    >
                      {loading ? <Spinner animation="border" size="sm" /> : "Send"}
                    </Button>
                  </Col>
                </Row>
              </Form>
              <div className="text-center text-muted small mt-2">
                Powered by CredVest AI • GPT-5.1 / Gemini backend
              </div>
            </Card.Footer>
          </Card>
        </div>
      </Container>
    </div>
  );
}
