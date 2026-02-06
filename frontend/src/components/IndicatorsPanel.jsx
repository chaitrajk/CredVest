import React from "react";
import {
  ChartCanvas,
  Chart,
  CandlestickSeries,
  XAxis,
  YAxis,
  MACDSeries,
  RSISeries,
  BarSeries,
  LineSeries,
  ema,
  macd,
  rsi,
} from "react-financial-charts";

export default function IndicatorsPanel({ candles }) {
  if (!candles || candles.length === 0) return null;

  const data = candles.map((d, i) => ({
    ...d,
    idx: i,
  }));

  const ema20 = ema().options({ windowSize: 20 }).merge((d, v) => (d.ema20 = v)).accessor((d) => d.ema20);
  const ema50 = ema().options({ windowSize: 50 }).merge((d, v) => (d.ema50 = v)).accessor((d) => d.ema50);
  const ema200 = ema().options({ windowSize: 200 }).merge((d, v) => (d.ema200 = v)).accessor((d) => d.ema200);

  const macdCalc = macd()
    .options({ fast: 12, slow: 26, signal: 9 })
    .merge((d, v) => (d.macd = v))
    .accessor((d) => d.macd);

  const rsiCalc = rsi()
    .options({ windowSize: 14 })
    .merge((d, v) => (d.rsi = v))
    .accessor((d) => d.rsi);

  ema20(data);
  ema50(data);
  ema200(data);
  macdCalc(data);
  rsiCalc(data);

  return (
    <ChartCanvas
      height={550}
      width={1000}
      seriesName="Indicators"
      data={data}
      xAccessor={(d) => d.idx}
      ratio={1}
      margin={{ left: 70, right: 70, top: 20, bottom: 30 }}
    >
      {/* Main Candlestick Chart */}
      <Chart id={1} height={250}>
        <YAxis />
        <XAxis showLabels={false} />
        <CandlestickSeries />
        <LineSeries yAccessor={ema20.accessor()} stroke="#ffb300" />
        <LineSeries yAccessor={ema50.accessor()} stroke="#0288d1" />
        <LineSeries yAccessor={ema200.accessor()} stroke="#9c27b0" />
      </Chart>

      {/* Volume */}
      <Chart id={2} height={100} origin={(w, h) => [0, 260]}>
        <YAxis />
        <XAxis showLabels={false} />
        <BarSeries yAccessor={(d) => d.volume} />
      </Chart>

      {/* MACD */}
      <Chart id={3} height={100} origin={(w, h) => [0, 360]}>
        <YAxis />
        <XAxis showLabels={false} />
        <MACDSeries yAccessor={macdCalc.accessor()} />
      </Chart>

      {/* RSI */}
      <Chart id={4} height={100} origin={(w, h) => [0, 460]}>
        <YAxis />
        <XAxis />
        <RSISeries yAccessor={rsiCalc.accessor()} />
      </Chart>
    </ChartCanvas>
  );
}

