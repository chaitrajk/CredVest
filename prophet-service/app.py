# prophet-service/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
from prophet import Prophet
import pandas as pd
import traceback

app = Flask(__name__)
CORS(app)


def clean_close(df):
    if df is None:
        return None
    if "Close" not in df.columns:
        return None
    col = df["Close"]
    if isinstance(col, pd.DataFrame):
        col = col.iloc[:, 0]
    return pd.to_numeric(col, errors="coerce")


def download_with_fallback(symbol, period="5y"):
    """
    Try yf.download(), fall back to yf.Ticker(symbol).history() if download fails.
    Returns DataFrame or None.
    """
    try:
        df = yf.download(symbol, period=period, progress=False, threads=False)
        if df is None or df.empty:
            # fallback
            t = yf.Ticker(symbol)
            df = t.history(period=period)
        return df
    except Exception as e:
        print(f"yfinance download failed for {symbol}: {e}")
        try:
            t = yf.Ticker(symbol)
            df = t.history(period=period)
            return df
        except Exception as e2:
            print(f"yfinance ticker.history also failed for {symbol}: {e2}")
            return None


@app.post("/forecast")
def forecast():
    try:
        data = request.json or {}
        symbol = data.get("symbol")
        periods = int(data.get("periods", 180))  # allow forwarded horizon
        if not symbol:
            return jsonify({"error": "Symbol required"}), 400

        print(f"\n📌 Forecast for {symbol} — periods={periods}")

        df = download_with_fallback(symbol, period="5y")
        if df is None or df.empty:
            return jsonify({"error": "No data found"}), 404

        close = clean_close(df)
        if close is None or close.dropna().empty:
            return jsonify({"error": "Invalid data"}), 500

        df2 = df.reset_index()
        df2["y"] = close.reset_index(drop=True)
        # rename column to ds
        if "Date" in df2.columns:
            df2 = df2.rename(columns={"Date": "ds"})
        elif "Datetime" in df2.columns:
            df2 = df2.rename(columns={"Datetime": "ds"})
        # ensure columns present
        df2 = df2[["ds", "y"]].dropna()
        df2["y"] = pd.to_numeric(df2["y"], errors="coerce")
        df2 = df2.dropna()
        if df2.empty:
            return jsonify({"error": "Not enough valid price data"}), 500

        model = Prophet(daily_seasonality=True)
        model.fit(df2)

        future = model.make_future_dataframe(periods=periods)
        forecast = model.predict(future)

        fc = forecast.tail(periods)
        months = fc["ds"].dt.strftime("%Y-%m-%d").tolist()
        prices = fc["yhat"].round(2).tolist()

        return jsonify({"months": months, "prices": prices, "model": "Prophet ML Forecast"})
    except Exception as e:
        print("🔥 PROPHET ERROR:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.post("/insights")
def insights():
    try:
        data = request.json or {}
        symbol = data.get("symbol")
        if not symbol:
            return jsonify({"error": "Symbol required"}), 400

        print(f"\n📌 Insights for {symbol}")

        df = download_with_fallback(symbol, period="1y")
        if df is None or df.empty:
            return jsonify({"error": "No data found"}), 404

        close = clean_close(df)
        if close is None or close.dropna().empty:
            return jsonify({"error": "Invalid data"}), 500

        pct = close.pct_change().dropna()
        mean_ret = float(pct.mean())
        vol = float(pct.std())

        annualReturn = mean_ret * 252 * 100
        annualVolatility = vol * (252 ** 0.5) * 100
        riskScore = min(100, max(1, annualVolatility / 2))

        if annualReturn > 10:
            label = "Strong Uptrend"
        elif annualReturn > -5:
            label = "Sideways"
        else:
            label = "Downtrend"

        return jsonify(
            {
                "annualReturn": round(annualReturn, 2),
                "annualVolatility": round(annualVolatility, 2),
                "riskScore": round(riskScore, 2),
                "label": label,
            }
        )
    except Exception as e:
        print("🔥 INSIGHTS ERROR:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.get("/")
def home():
    return "Prophet ML Service Running"


if __name__ == "__main__":
    # Use 5001 to avoid clash
    app.run(port=5001)
