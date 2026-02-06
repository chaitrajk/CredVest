import React, { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
} from "lightweight-charts";

export default function TradingViewChart({ candles }) {
  const chartRef = useRef();

  useEffect(() => {
    if (!candles || candles.length === 0) return;

    const container = chartRef.current;
    container.innerHTML = "";

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 420,
      layout: { background: { color: "#ffffff" }, textColor: "#333" },
      grid: {
        vertLines: { color: "#eee" },
        horzLines: { color: "#eee" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: "#ccc" },
      rightPriceScale: { borderColor: "#ccc" },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#0dbf3f",
      borderUpColor: "#0dbf3f",
      wickUpColor: "#0dbf3f",
      downColor: "#ff4976",
      borderDownColor: "#ff4976",
      wickDownColor: "#ff4976",
    });

    const formatted = candles.map((c) => ({
      time: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(formatted);

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles]);

  return <div ref={chartRef} style={{ width: "100%", height: "420px" }} />;
}
