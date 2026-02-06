// src/pages/OCRAnalyzer.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  Container,
  Card,
  Button,
  Form,
  Table,
  Row,
  Col,
  Modal,
  Badge,
  OverlayTrigger,
  Tooltip,
  InputGroup,
} from "react-bootstrap";

import dayjs from "dayjs";
import { saveAs } from "file-saver";
import confetti from "canvas-confetti";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Chart.js
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from "chart.js";

import { Pie, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

// API NORMALIZER
const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const BASE = RAW_API.replace(/\/+$/, "");
const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;


// CATEGORY COLORS
const CATEGORY_COLORS = {
  Food: "#ef4444",
  Groceries: "#f59e0b",
  Rent: "#6b7280",
  "Water Bill": "#60a5fa",
  "Electricity Bill": "#f97316",
  Subscriptions: "#8b5cf6",
  Transport: "#10b981",
  Shopping: "#ec4899",
  Healthcare: "#14b8a6",
  Dining: "#f43f5e",
  Education: "#06b6d4",
  Internet: "#7c3aed",
  Mobile: "#0ea5e9",
  Taxes: "#64748b",
  Others: "#94a3b8",
};

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f43f5e",
  "#64748b",
];


// ----------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------

export default function OCRAnalyzer() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [ocr, setOcr] = useState(null);
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState([]);

  const [paymentMode, setPaymentMode] = useState("Card");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const [aiSummary, setAiSummary] = useState("");
  const [autoCategoryLoading, setAutoCategoryLoading] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [friendsSplit, setFriendsSplit] = useState([{ name: "", share: 0 }]);

  const [selectedMonthForTrend, setSelectedMonthForTrend] = useState(
    dayjs().format("MMMM YYYY")
  );

  const [filterCategory, setFilterCategory] = useState(null);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("cv_dark") === "1"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const containerRef = useRef(null);
  const token = localStorage.getItem("token");

  // chart refs
  const donutRef = useRef(null);
  const donutContainerRef = useRef(null);
  const barContainerRef = useRef(null);
  const lineContainerRef = useRef(null);

  // ----------------------------------------------------------------
  // LOAD HISTORY
  // ----------------------------------------------------------------
  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    document.documentElement.style.background = darkMode ? "#0b1220" : "#fff";
    localStorage.setItem("cv_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  async function loadHistory() {
    try {
      const res = await axios.get(`${API}/transactions/ocr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data.transactions || []);
    } catch (err) {
      console.error("History load failed:", err);
    }
  }


  // ----------------------------------------------------------------
  // FILE UPLOAD
  // ----------------------------------------------------------------
  const handleUpload = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f) {
      if (f.type === "application/pdf") setPreview("PDF Preview Not Available");
      else setPreview(URL.createObjectURL(f));
    } else setPreview(null);

    setOcr(null);
    setItems([]);
    setRows([]);
    setAiSummary("");
  };


  // ----------------------------------------------------------------
  // ANALYZE (OCR)
  // ----------------------------------------------------------------
  const analyze = async (enhanced) => {
    if (!file) return alert("Upload a bill first!");

    try {
      setLoading(true);

      const form = new FormData();
      form.append("file", file);
      if (enhanced) form.append("enhance", "true");

      const res = await axios.post(`${API}/ocr/analyze`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const data = res.data;
      setOcr(data);

      const lineItems = data.items || [];
      lineItems.forEach((it, i) => (it.id = i));
      setItems(lineItems);

      const detected =
        Number(data.total) ||
        lineItems.reduce((s, x) => s + Number(x.amount || 0), 0);

      setRows([{ category: data.mainCategory || "Others", amount: detected }]);

      setAiSummary("");
    } catch (err) {
      console.error("OCR ERROR:", err);
      alert("OCR failed.");
    } finally {
      setLoading(false);
    }
  };


  // ----------------------------------------------------------------
  // ROW MANAGEMENT
  // ----------------------------------------------------------------
  const addRow = () => setRows([...rows, { category: "Others", amount: 0 }]);

  const updateRow = (i, field, value) => {
    const copy = [...rows];
    copy[i][field] = field === "amount" ? Number(value) : value;
    setRows(copy);
  };

  const deleteRow = (i) => {
    setRows(rows.filter((_, idx) => idx !== i));
  };


  // ----------------------------------------------------------------
  // SAVE SCAN + CONFETTI
  // ----------------------------------------------------------------
  const handleSave = async () => {
    if (!ocr) return alert("Scan first!");

    const total =
      Number(ocr.total) || rows.reduce((s, r) => s + Number(r.amount || 0), 0);

    try {
      await axios.post(
        `${API}/transactions`,
        {
          type: "DEBIT",
          description: `${ocr.merchant} Bill`,
          merchant: ocr.merchant,
          amount: total,
          paymentMode,
          source: "OCR",
          date: ocr.date,
          billImage: ocr.imageUrl,
          items: items.map(({ id, ...rest }) => rest),
          split: rows,
          taxes: ocr.taxes || {},
          subscription: ocr.subscription || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      confetti({ particleCount: 120, spread: 70, origin: { y: 0.4 } });

      setTimeout(() => {
        setOcr(null);
        setItems([]);
        setRows([]);
        setAiSummary("");
      }, 700);

      loadHistory();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed.");
    }
  };


  // ----------------------------------------------------------------
  // LOAD OLD SCAN
  // ----------------------------------------------------------------
  const loadOldScan = (t) => {
    setOcr({
      merchant: t.merchant,
      date: t.date,
      total: t.amount,
      imageUrl: t.billImage,
      taxes: t.taxes || {},
      subscription: t.subscription || null,
      mainCategory:
        (t.split && t.split[0] && t.split[0].category) || "Others",
    });

    setItems(t.items || []);
    setRows(
      (t.split && t.split.length && t.split) || [
        { category: t.category || "Others", amount: t.amount },
      ]
    );

    setAiSummary("");
    setSelectedMonthForTrend(dayjs(t.date).format("MMMM YYYY"));
  };


  // ----------------------------------------------------------------
  // AUTO CATEGORY
  // ----------------------------------------------------------------
  const runAutoClassify = async () => {
    if (!ocr) return alert("Scan first");

    try {
      setAutoCategoryLoading(true);

      const payload = {
        rawText: ocr.rawText || "",
        merchant: ocr.merchant || "",
        itemsText: items.map((i) => i.name).join(", "),
      };

      const res = await axios.post(`${API}/ocr/classify`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const category = res.data.category || "Others";

      setRows([{ category, amount: detectedTotal }]);

      setOcr((prev) => ({
        ...(prev || {}),
        taxes: res.data.taxes || {},
        subscription: res.data.subscription || null,
        mainCategory: category,
      }));
    } catch (err) {
      console.error("classify fail", err);
      alert("Auto category failed");
    } finally {
      setAutoCategoryLoading(false);
    }
  };


  // ----------------------------------------------------------------
  // AI SUMMARY
  // ----------------------------------------------------------------
  const runAISummary = async () => {
    if (!ocr) return alert("Scan first");

    try {
      const res = await axios.post(
        `${API}/ocr/summarize`,
        {
          rawText: ocr.rawText,
          merchant: ocr.merchant,
          date: ocr.date,
          total: detectedTotal,
          items,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAiSummary(res.data.summary || "");
    } catch (err) {
      console.error("summary error", err);
      alert("Summary failed");
    }
  };


  // ----------------------------------------------------------------
  // EXPORT RECEIPT PDF (single receipt)
  // ----------------------------------------------------------------
  const handleExportPdf = async () => {
    if (!ocr) return alert("Scan first");

    try {
      const payload = {
        merchant: ocr.merchant,
        date: ocr.date,
        total: detectedTotal,
        items,
        taxes: ocr.taxes || {},
        rawText: ocr.rawText || "",
        imageUrl: ocr.imageUrl || "",
      };

      const res = await axios.post(`${API}/ocr/export-pdf`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      saveAs(res.data, `receipt-${Date.now()}.pdf`);
    } catch (err) {
      console.error("pdf error", err);
      alert("Export failed");
    }
  };


  // ----------------------------------------------------------------
  // EXPORT DASHBOARD PDF
  // ----------------------------------------------------------------
  const exportDashboardPdf = async () => {
    try {
      const canvas = await html2canvas(containerRef.current, { scale: 1.7 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("landscape", "pt", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`dashboard-${Date.now()}.pdf`);
    } catch (err) {
      console.error("export dash fail", err);
      alert("Could not export dashboard");
    }
  };


  // ----------------------------------------------------------------
  // DONUT CLICK DRILLDOWN
  // ----------------------------------------------------------------
  const onDonutClickHandler = (evt) => {
    try {
      const chart = donutRef.current?.chartInstance || donutRef.current;
      if (!chart) return;

      const points = chart.getElementsAtEventForMode(
        evt.nativeEvent,
        "nearest",
        { intersect: true },
        true
      );

      if (!points || !points.length) return setFilterCategory(null);

      const idx = points[0].index;
      const label = donutData.labels[idx];

      setFilterCategory((prev) => (prev === label ? null : label));
    } catch (e) {
      console.warn("donut click error", e);
    }
  };


  // ----------------------------------------------------------------
  // DELETE HISTORY
  // ----------------------------------------------------------------
  const deleteHistory = async (id) => {
    if (!confirm("Delete this scan permanently?")) return;

    try {
      setDeletingId(id);

      await axios.delete(`${API}/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      confetti({ particleCount: 60, spread: 50 });

      await loadHistory();
      setDeletingId(null);
    } catch (err) {
      console.error("delete failed", err);
      alert("Delete error");
      setDeletingId(null);
    }
  };


  // ----------------------------------------------------------------
  // CATEGORY + VISUAL CHART CALCULATIONS
  // ----------------------------------------------------------------

  const detectedTotal = useMemo(
    () =>
      ocr?.total ||
      rows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [ocr, rows]
  );

  const categoryDistributionFromHistory = useMemo(() => {
    const map = {};
    history.forEach((t) => {
      if (t.split && Array.isArray(t.split)) {
        t.split.forEach((s) => {
          const cat = s.category || "Others";
          map[cat] = (map[cat] || 0) + Number(s.amount || 0);
        });
      } else {
        const cat =
          t.category ||
          (t.split && t.split[0] && t.split[0].category) ||
          "Others";
        map[cat] = (map[cat] || 0) + Number(t.amount || 0);
      }
    });
    return map;
  }, [history]);

  const currentCategorySnapshot = useMemo(() => {
    const snap = { ...categoryDistributionFromHistory };
    rows.forEach((r) => {
      const cat = r.category || "Others";
      snap[cat] = (snap[cat] || 0) + Number(r.amount || 0);
    });
    return snap;
  }, [rows, categoryDistributionFromHistory]);


  // donut
  const donutData = useMemo(() => {
    const labels = Object.keys(currentCategorySnapshot);
    const values = labels.map((k) => currentCategorySnapshot[k]);
    const colors = labels.map(
      (l, i) => CATEGORY_COLORS[l] || PALETTE[i % PALETTE.length]
    );

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
        },
      ],
    };
  }, [currentCategorySnapshot]);


  // bar chart: compare this vs last month
  const barData = useMemo(() => {
    const allCats = new Set();

    const now = dayjs();
    const thisKey = now.format("MMMM YYYY");
    const lastKey = now.subtract(1, "month").format("MMMM YYYY");

    const mapThis = {};
    const mapLast = {};

    history.forEach((t) => {
      const m = dayjs(t.date).format("MMMM YYYY");

      if (m === thisKey || m === lastKey) {
        if (t.split && Array.isArray(t.split)) {
          t.split.forEach((s) => {
            const c = s.category || "Others";
            allCats.add(c);
            if (m === thisKey)
              mapThis[c] = (mapThis[c] || 0) + Number(s.amount || 0);
            else mapLast[c] = (mapLast[c] || 0) + Number(s.amount || 0);
          });
        } else {
          const c = t.category || "Others";
          allCats.add(c);
          if (m === thisKey)
            mapThis[c] = (mapThis[c] || 0) + Number(t.amount || 0);
          else mapLast[c] = (mapLast[c] || 0) + Number(t.amount || 0);
        }
      }
    });

    const labels = Array.from(allCats);
    const thisVals = labels.map((l) => mapThis[l] || 0);
    const lastVals = labels.map((l) => mapLast[l] || 0);
    const colors = labels.map(
      (l, i) => CATEGORY_COLORS[l] || PALETTE[i % PALETTE.length]
    );

    return {
      labels,
      datasets: [
        {
          label: thisKey,
          data: thisVals,
          backgroundColor: colors.map((c) => hexToRgba(c, 0.8)),
        },
        {
          label: lastKey,
          data: lastVals,
          backgroundColor: colors.map((c) => hexToRgba(c, 0.35)),
        },
      ],
    };
  }, [history]);


  // daily trend
  const groupedByMonth = useMemo(() => {
    const map = {};
    history.forEach((t) => {
      const m = dayjs(t.date).format("MMMM YYYY");
      map[m] = map[m] || [];
      map[m].push(t);
    });

    return Object.fromEntries(
      Object.entries(map).sort(
        (a, b) =>
          dayjs(b[0], "MMMM YYYY").unix() -
          dayjs(a[0], "MMMM YYYY").unix()
      )
    );
  }, [history]);

  const lineData = useMemo(() => {
    const [monthName, year] = selectedMonthForTrend.split(" ");
    const parsed = dayjs(`${monthName} 1 ${year}`, "MMMM D YYYY");

    if (!parsed.isValid()) return { labels: [], datasets: [] };

    const days = parsed.daysInMonth();
    const labels = Array.from({ length: days }, (_, i) => i + 1);

    const daily = Array(days).fill(0);

    (groupedByMonth[selectedMonthForTrend] || []).forEach((t) => {
      const idx = dayjs(t.date).date() - 1;
      daily[idx] += Number(t.amount || 0);
    });

    return {
      labels,
      datasets: [
        {
          label: `${selectedMonthForTrend} Spending`,
          data: daily,
          borderColor: "#3b82f6",
          backgroundColor: hexToRgba("#3b82f6", 0.15),
          fill: true,
          pointRadius: 2,
          tension: 0.3,
        },
      ],
    };
  }, [groupedByMonth, selectedMonthForTrend]);


  // search + filter
  const filteredHistory = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();

    return history.filter((h) => {
      if (
        filterCategory &&
        !(
          (h.category && h.category === filterCategory) ||
          (h.split && h.split.some((s) => s.category === filterCategory))
        )
      )
        return false;

      if (!q) return true;

      return (
        (h.merchant || "").toLowerCase().includes(q) ||
        (h.date || "").includes(q) ||
        String(h.amount).includes(q)
      );
    });
  }, [history, searchQuery, filterCategory]);


  // utilities
  function hexToRgba(hex, alpha = 1) {
    const h = hex.replace("#", "");
    const bigint = parseInt(
      h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
      16
    );

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }


  // ----------------------------------------------------------------
  // UI START
  // ----------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      style={{
        padding: 24,
        background: darkMode ? "#071024" : "#fff",
        minHeight: "100vh",
        color: darkMode ? "#e6eef8" : "#111",
      }}
    >
      <Container fluid>
        {/* HEADER */}
        <Row className="align-items-center mb-3">
          <Col>
            <h2>
              OCR Analyzer —{" "}
              <span style={{ color: "#3b82f6" }}>Supercharged</span>
            </h2>
            <div className="small text-muted">
              AI Summary, Auto Category, Dashboard PDF, Charts, Filters,
              Deletion, Timeline — all in one page.
            </div>
          </Col>

          <Col className="text-end">
            <Button
              size="sm"
              variant={darkMode ? "light" : "dark"}
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>{" "}
            <Button
              size="sm"
              variant="outline-primary"
              onClick={exportDashboardPdf}
            >
              Export Dashboard PDF
            </Button>
          </Col>
        </Row>

        {/* UPLOAD + ACTIONS */}
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={5}>
                <Form.Control
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleUpload}
                />

                <div className="mt-3">
                  {preview &&
                  preview !== "PDF Preview Not Available" ? (
                    <img
                      src={preview}
                      alt="preview"
                      style={{
                        maxWidth: 200,
                        borderRadius: 8,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                      }}
                    />
                  ) : (
                    <p className="text-muted">
                      {preview || "Upload a receipt image"}
                    </p>
                  )}
                </div>
              </Col>

              <Col md={7}>
                <div className="d-flex flex-wrap gap-2">
                  <Button onClick={() => analyze(false)} disabled={loading}>
                    {loading ? "Extracting..." : "Extract & Analyze"}
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => analyze(true)}
                    disabled={loading}
                  >
                    Enhanced Scan
                  </Button>

                  <Button
                    variant="success"
                    onClick={runAISummary}
                    disabled={!ocr}
                  >
                    AI Summary
                  </Button>

                  <Button
                    variant="info"
                    onClick={runAutoClassify}
                    disabled={!ocr || autoCategoryLoading}
                  >
                    {autoCategoryLoading ? "Detecting..." : "Auto Categorize"}
                  </Button>

                  <Button
                    variant="outline-primary"
                    onClick={() => setSplitOpen(true)}
                    disabled={!ocr}
                  >
                    Split Bill
                  </Button>

                  <Button
                    variant="outline-dark"
                    onClick={handleExportPdf}
                    disabled={!ocr}
                  >
                    Export PDF
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setOcr(null);
                      setItems([]);
                      setRows([]);
                      setAiSummary("");
                    }}
                  >
                    Clear
                  </Button>
                </div>

                {/* BADGE ROW */}
                <div className="mt-3 d-flex gap-2 flex-wrap">
                  {ocr?.taxes && (
                    <Badge bg="light" text="dark">
                      Taxes: ₹{ocr.taxes.GST_TOTAL || 0}
                    </Badge>
                  )}

                  {ocr?.subscription && (
                    <Badge bg="warning" text="dark">
                      Subscription: {ocr.subscription.matched}
                    </Badge>
                  )}

                  {ocr?.mainCategory && (
                    <Badge
                      style={{
                        background:
                          CATEGORY_COLORS[ocr.mainCategory] || "#94a3b8",
                      }}
                    >
                      {ocr.mainCategory}
                    </Badge>
                  )}

                  {filterCategory && (
                    <Badge bg="info">
                      Filter: {filterCategory}{" "}
                      <span
                        style={{ cursor: "pointer", marginLeft: 6 }}
                        onClick={() => setFilterCategory(null)}
                      >
                        ✕
                      </span>
                    </Badge>
                  )}
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* AI SUMMARY */}
        {aiSummary && (
          <Card className="mb-3">
            <Card.Body>
              <h6>AI Summary</h6>
              <div>{aiSummary}</div>
            </Card.Body>
          </Card>
        )}

        {/* MAIN CHART GRID */}
        <Row>
          {/* LEFT COLUMN */}
          <Col md={6}>
            {/* DONUT */}
            <Card className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <h6>Category Distribution</h6>
                  <Button
                    size="sm"
                    onClick={() =>
                      downloadChart(donutContainerRef.current, "donut.png")
                    }
                  >
                    Download
                  </Button>
                </div>

                <div
                  style={{ width: "260px", cursor: "pointer" }}
                  onClick={(e) => onDonutClickHandler(e)}
                  ref={donutContainerRef}
                >
                  <Pie ref={donutRef} data={donutData} />
                </div>
              </Card.Body>
            </Card>

            {/* BAR */}
            <Card className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <h6>This Month vs Last Month</h6>
                  <Button
                    size="sm"
                    onClick={() =>
                      downloadChart(barContainerRef.current, "compare.png")
                    }
                  >
                    Download
                  </Button>
                </div>

                <div ref={barContainerRef}>
                  <Bar data={barData} />
                </div>
              </Card.Body>
            </Card>

            {/* LINE */}
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <h6>Daily Trend</h6>

                  <Form.Select
                    size="sm"
                    style={{ width: 160 }}
                    value={selectedMonthForTrend}
                    onChange={(e) => setSelectedMonthForTrend(e.target.value)}
                  >
                    {Object.keys(groupedByMonth).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Form.Select>
                </div>

                <div ref={lineContainerRef}>
                  <Line data={lineData} />
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* RIGHT COLUMN */}
          <Col md={6}>
            {/* ITEMS */}
            <Card className="mb-3">
              <Card.Body>
                <h6>Parsed Items</h6>
                <Table size="sm" bordered>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.name}</td>
                        <td>₹{it.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* CATEGORY / SPLIT */}
            <Card className="mb-3">
              <Card.Body>
                <h6>Categories / Split</h6>

                <Table size="sm">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <Form.Select
                            value={r.category}
                            onChange={(e) =>
                              updateRow(i, "category", e.target.value)
                            }
                            style={{
                              borderLeft: `6px solid ${
                                CATEGORY_COLORS[r.category] || "#94a3b8"
                              }`,
                            }}
                          >
                            {Object.keys(CATEGORY_COLORS).map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </Form.Select>
                        </td>

                        <td>
                          <Form.Control
                            type="number"
                            value={r.amount}
                            onChange={(e) =>
                              updateRow(i, "amount", e.target.value)
                            }
                          />
                        </td>

                        <td>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteRow(i)}
                          >
                            X
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Button onClick={addRow}>+ Add Row</Button>{" "}
                <Button variant="success" onClick={handleSave}>
                  Save Scan
                </Button>
              </Card.Body>
            </Card>

            {/* TIMELINE - QUICK PREVIEW */}
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6>Recently Viewed</h6>

                  <InputGroup size="sm" style={{ width: 200 }}>
                    <Form.Control
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </InputGroup>
                </div>

                <div className="d-flex flex-wrap gap-3">
                  {filteredHistory.slice(0, 8).map((h) => (
                    <div
                      key={h._id}
                      style={{ width: 120, cursor: "pointer" }}
                      onClick={() => loadOldScan(h)}
                    >
                      <div
                        style={{
                          height: 80,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#f1f1f8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={h.billImage || "/placeholder.png"}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                          }}
                        />
                      </div>

                      <div className="mt-1">
                        <div style={{ fontSize: 13 }}>{h.merchant}</div>
                        <b>₹{h.amount}</b>
                        <div className="small text-muted">
                          {dayjs(h.date).format("DD MMM")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* FULL HISTORY TABLE WITH DELETE */}
        <Card className="mt-4">
          <Card.Body>
            <h5>All Scans</h5>

            <Table hover responsive>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Total</th>
                  <th>Category</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map((h) => (
                  <tr key={h._id}>
                    <td>{dayjs(h.date).format("DD MMM YYYY")}</td>
                    <td>{h.merchant}</td>
                    <td>₹{h.amount}</td>
                    <td>
                      <Badge
                        style={{
                          background:
                            CATEGORY_COLORS[h.category || "Others"],
                        }}
                      >
                        {h.category || "Others"}
                      </Badge>
                    </td>

                    <td>
                      <Button size="sm" onClick={() => loadOldScan(h)}>
                        Load
                      </Button>{" "}
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deletingId === h._id}
                        onClick={() => deleteHistory(h._id)}
                      >
                        {deletingId === h._id ? "Deleting..." : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        {/* SPLIT MODAL */}
        <Modal show={splitOpen} onHide={() => setSplitOpen(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Split Bill</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p>
              Total: <b>₹{detectedTotal}</b>
            </p>

            {friendsSplit.map((f, i) => (
              <div key={i} className="d-flex gap-2 mb-2">
                <Form.Control
                  placeholder="Name"
                  value={f.name}
                  onChange={(e) => updateFriend(i, "name", e.target.value)}
                />

                <Form.Control
                  type="number"
                  placeholder="Share (optional)"
                  value={f.share}
                  onChange={(e) => updateFriend(i, "share", e.target.value)}
                />
              </div>
            ))}

            <Button size="sm" onClick={() => setFriendsSplit([...friendsSplit, { name: "", share: 0 }])}>
              Add Person
            </Button>{" "}
            <Button size="sm" onClick={() => {
              const total = detectedTotal;
              const valid = friendsSplit.filter((f) => f.name);
              if (!valid.length) return alert("Enter at least one friend");
              const equal = Math.round((total / valid.length) * 100) / 100;
              setRows(
                valid.map((f) => ({
                  category: f.name,
                  amount: f.share > 0 ? f.share : equal,
                }))
              );
              setSplitOpen(false);
            }}>
              Apply Split
            </Button>
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
}


// small helper — download chart image
async function downloadChart(node, filename = "chart.png") {
  if (!node) return;
  try {
    const canvas = await html2canvas(node, { scale: 2 });
    canvas.toBlob((blob) => saveAs(blob, filename));
  } catch (e) {
    console.error("chart export error", e);
  }
}
