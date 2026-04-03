import { useState } from "react";

type CalcTab = "position-size" | "option-greeks" | "pivot-fibonacci";

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function PositionSizer() {
  const [capital, setCapital] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const capNum = parseFloat(capital) || 0;
  const riskNum = parseFloat(riskPct) || 0;
  const entryNum = parseFloat(entry) || 0;
  const slNum = parseFloat(stopLoss) || 0;

  const riskAmount = capNum * (riskNum / 100);
  const riskPerShare = Math.abs(entryNum - slNum);
  const positionSize = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const totalInvestment = positionSize * entryNum;
  const capitalAtRisk = positionSize * riskPerShare;
  const portfolioPct = capNum > 0 ? (totalInvestment / capNum) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
        <div className="text-green-400 font-bold text-sm mb-1">📐 What is Position Sizing?</div>
        <p className="text-gray-400 text-xs leading-relaxed">
          Position sizing tells you exactly how many shares to buy so that if your stop-loss is hit, you lose no more than your predefined risk amount. This is the #1 rule of professional risk management.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Total Trading Capital (₹)</label>
          <input type="number" value={capital} onChange={e => setCapital(e.target.value)} placeholder="e.g. 500000" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Risk per Trade (%)</label>
          <div className="flex gap-2">
            <input type="number" step="0.1" value={riskPct} onChange={e => setRiskPct(e.target.value)} placeholder="1" className="flex-1 bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
            <div className="flex gap-1">
              {["0.5", "1", "2", "3"].map(v => (
                <button key={v} onClick={() => setRiskPct(v)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${riskPct === v ? "bg-green-600 text-white" : "bg-[hsl(220,13%,18%)] text-gray-400 hover:text-white"}`}>{v}%</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Entry Price (₹)</label>
          <input type="number" step="0.05" value={entry} onChange={e => setEntry(e.target.value)} placeholder="e.g. 2450.00" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Stop-Loss Price (₹)</label>
          <input type="number" step="0.05" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="e.g. 2420.00" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
      </div>

      {positionSize > 0 && (
        <div className="bg-[hsl(220,13%,12%)] border border-green-500/30 rounded-xl p-5">
          <div className="text-green-400 font-bold mb-4 text-sm">📊 Position Size Result</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 rounded-xl p-3 text-center">
              <div className="text-3xl font-black text-green-400">{positionSize.toLocaleString("en-IN")}</div>
              <div className="text-gray-400 text-xs mt-1">Shares to Buy</div>
            </div>
            <div className="bg-[hsl(220,13%,9%)] rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">₹{fmt(totalInvestment, 0)}</div>
              <div className="text-gray-400 text-xs mt-1">Total Investment</div>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red-400">₹{fmt(capitalAtRisk, 0)}</div>
              <div className="text-gray-400 text-xs mt-1">Capital at Risk</div>
            </div>
            <div className="bg-[hsl(220,13%,9%)] rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-amber-400">{fmt(portfolioPct, 1)}%</div>
              <div className="text-gray-400 text-xs mt-1">Portfolio Concentration</div>
            </div>
          </div>
          {portfolioPct > 20 && (
            <div className="mt-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
              ⚠️ Position concentration is {fmt(portfolioPct, 1)}% of capital. Professional traders typically limit a single position to 5–15%.
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-600 text-center">This calculator is for educational purposes. Always do your own analysis before trading.</div>
    </div>
  );
}

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
function normCDF(x: number) { return 0.5 * (1 + erf(x / Math.sqrt(2))); }
function normPDF(x: number) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }

function OptionGreeks() {
  const [spot, setSpot] = useState("");
  const [strike, setStrike] = useState("");
  const [rate, setRate] = useState("6.5");
  const [iv, setIv] = useState("");
  const [dte, setDte] = useState("");
  const [optType, setOptType] = useState<"call" | "put">("call");

  const S = parseFloat(spot), K = parseFloat(strike), r = parseFloat(rate) / 100;
  const vol = parseFloat(iv) / 100, T = parseFloat(dte) / 365;
  const valid = S > 0 && K > 0 && vol > 0 && T > 0;

  let delta = 0, gamma = 0, theta = 0, vega = 0, price = 0;
  if (valid) {
    const d1 = (Math.log(S / K) + (r + 0.5 * vol * vol) * T) / (vol * Math.sqrt(T));
    const d2 = d1 - vol * Math.sqrt(T);
    const Nd1 = normCDF(d1), Nd2 = normCDF(d2), nd1 = normPDF(d1);
    if (optType === "call") {
      price = S * Nd1 - K * Math.exp(-r * T) * Nd2;
      delta = Nd1;
      theta = (-(S * nd1 * vol) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Nd2) / 365;
    } else {
      price = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
      delta = Nd1 - 1;
      theta = (-(S * nd1 * vol) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normCDF(-d2)) / 365;
    }
    gamma = nd1 / (S * vol * Math.sqrt(T));
    vega = S * nd1 * Math.sqrt(T) / 100;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="text-blue-400 font-bold text-sm mb-1">🔢 Black-Scholes Option Calculator</div>
        <p className="text-gray-400 text-xs leading-relaxed">
          Calculates theoretical option price and Greeks (Delta, Gamma, Theta, Vega) using the Black-Scholes model. Use this to evaluate if options are fairly priced and understand your risk exposure.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Spot Price (₹)</label>
          <input type="number" value={spot} onChange={e => setSpot(e.target.value)} placeholder="Current market price" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Strike Price (₹)</label>
          <input type="number" value={strike} onChange={e => setStrike(e.target.value)} placeholder="Option strike" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Implied Volatility (%)</label>
          <input type="number" value={iv} onChange={e => setIv(e.target.value)} placeholder="e.g. 18.5" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Days to Expiry</label>
          <input type="number" value={dte} onChange={e => setDte(e.target.value)} placeholder="e.g. 21" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Risk-Free Rate (%)</label>
          <input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} placeholder="6.5" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Option Type</label>
          <div className="flex rounded-xl overflow-hidden border border-[hsl(220,13%,22%)]">
            <button onClick={() => setOptType("call")} className={`flex-1 py-3 text-sm font-bold transition-colors ${optType === "call" ? "bg-green-600 text-white" : "bg-[hsl(220,13%,14%)] text-gray-400 hover:text-white"}`}>📈 Call</button>
            <button onClick={() => setOptType("put")} className={`flex-1 py-3 text-sm font-bold transition-colors ${optType === "put" ? "bg-red-600 text-white" : "bg-[hsl(220,13%,14%)] text-gray-400 hover:text-white"}`}>📉 Put</button>
          </div>
        </div>
      </div>

      {valid && (
        <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,24%)] rounded-xl p-5">
          <div className="text-white font-bold mb-4 text-sm">📈 Option Greeks</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Theoretical Price", value: `₹${fmt(price)}`, desc: "Fair value", color: "text-amber-400" },
              { label: "Delta (Δ)", value: fmt(delta, 4), desc: "Price sensitivity", color: "text-blue-400" },
              { label: "Gamma (Γ)", value: fmt(gamma, 6), desc: "Delta rate of change", color: "text-purple-400" },
              { label: "Theta (Θ)", value: `₹${fmt(theta, 4)}`, desc: "Time decay / day", color: "text-red-400" },
              { label: "Vega (V)", value: `₹${fmt(vega, 4)}`, desc: "Per 1% IV change", color: "text-green-400" },
              { label: "Intrinsic Value", value: `₹${fmt(Math.max(0, optType === "call" ? S - K : K - S))}`, desc: "In-the-money value", color: "text-white" },
            ].map(g => (
              <div key={g.label} className="bg-[hsl(220,13%,9%)] rounded-xl p-3 text-center">
                <div className={`text-xl font-black ${g.color}`}>{g.value}</div>
                <div className="text-gray-300 text-xs font-semibold mt-1">{g.label}</div>
                <div className="text-gray-600 text-xs">{g.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600 text-center">Uses Black-Scholes formula. For educational reference only. Real market prices may differ.</div>
    </div>
  );
}

function PivotFibonacci() {
  const [high, setHigh] = useState("");
  const [low, setLow] = useState("");
  const [close, setClose] = useState("");

  const H = parseFloat(high), L = parseFloat(low), C = parseFloat(close);
  const valid = H > 0 && L > 0 && C > 0 && H >= L;

  const PP = (H + L + C) / 3;
  const R1 = 2 * PP - L, R2 = PP + (H - L), R3 = H + 2 * (PP - L);
  const S1 = 2 * PP - H, S2 = PP - (H - L), S3 = L - 2 * (H - PP);
  const fibRange = H - L;
  const fibs = [
    { label: "0%", value: L },
    { label: "23.6%", value: L + 0.236 * fibRange },
    { label: "38.2%", value: L + 0.382 * fibRange },
    { label: "50%", value: L + 0.5 * fibRange },
    { label: "61.8%", value: L + 0.618 * fibRange },
    { label: "78.6%", value: L + 0.786 * fibRange },
    { label: "100%", value: H },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="text-purple-400 font-bold text-sm mb-1">📏 Pivot Points & Fibonacci Retracements</div>
        <p className="text-gray-400 text-xs leading-relaxed">
          Enter the previous session's High, Low, and Close to get Pivot Points (floor trader levels) and Fibonacci retracement levels — the two most-used support/resistance frameworks in technical analysis.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Previous High (₹)", val: high, set: setHigh },
          { label: "Previous Low (₹)", val: low, set: setLow },
          { label: "Previous Close (₹)", val: close, set: setClose },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs text-gray-400 mb-1.5 block">{f.label}</label>
            <input type="number" step="0.05" value={f.val} onChange={e => f.set(e.target.value)} placeholder="₹0.00" className="w-full bg-[hsl(220,13%,14%)] border border-[hsl(220,13%,22%)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500" />
          </div>
        ))}
      </div>

      {valid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,24%)] rounded-xl p-5">
            <div className="text-white font-bold mb-3 text-sm">🎯 Pivot Points (Floor Trader Method)</div>
            <div className="space-y-2">
              {[
                { l: "Resistance 3 (R3)", v: R3, c: "text-red-300" },
                { l: "Resistance 2 (R2)", v: R2, c: "text-red-400" },
                { l: "Resistance 1 (R1)", v: R1, c: "text-red-500" },
                { l: "Pivot Point (PP)", v: PP, c: "text-amber-400 font-black" },
                { l: "Support 1 (S1)", v: S1, c: "text-green-500" },
                { l: "Support 2 (S2)", v: S2, c: "text-green-400" },
                { l: "Support 3 (S3)", v: S3, c: "text-green-300" },
              ].map(r => (
                <div key={r.l} className={`flex justify-between items-center py-1.5 border-b border-[hsl(220,13%,17%)] last:border-0 ${r.l.includes("PP") ? "bg-amber-500/5 px-2 rounded-lg" : ""}`}>
                  <span className="text-gray-400 text-xs">{r.l}</span>
                  <span className={`text-sm font-bold ${r.c}`}>₹{fmt(r.v)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,24%)] rounded-xl p-5">
            <div className="text-white font-bold mb-3 text-sm">📐 Fibonacci Retracement Levels</div>
            <div className="space-y-2">
              {[...fibs].reverse().map(f => (
                <div key={f.label} className={`flex justify-between items-center py-1.5 border-b border-[hsl(220,13%,17%)] last:border-0 ${f.label === "61.8%" ? "bg-purple-500/5 px-2 rounded-lg" : ""}`}>
                  <span className="text-gray-400 text-xs">Fib {f.label}</span>
                  <span className={`text-sm font-bold ${f.label === "61.8%" ? "text-purple-400" : f.value >= PP ? "text-red-400" : "text-green-400"}`}>₹{fmt(f.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-purple-400/70 bg-purple-500/5 rounded-lg p-2">
              💡 61.8% (Golden Ratio) is the strongest Fibonacci level, often acting as the key support/resistance.
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600 text-center">Support/resistance levels are technical reference points, not buy/sell recommendations.</div>
    </div>
  );
}

export default function Calculators() {
  const [tab, setTab] = useState<CalcTab>("position-size");

  const TABS: { key: CalcTab; label: string; icon: string }[] = [
    { key: "position-size", label: "Position Sizer", icon: "⚖️" },
    { key: "option-greeks", label: "Option Greeks", icon: "📐" },
    { key: "pivot-fibonacci", label: "Pivot & Fibonacci", icon: "📏" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Market Calculators</h1>
        <p className="text-gray-500 text-sm mt-0.5">Professional tools for risk management &amp; technical analysis</p>
      </div>

      <div className="flex gap-2 mb-6 bg-[hsl(220,13%,11%)] p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${tab === t.key ? "bg-green-600 text-white shadow-lg shadow-green-900/30" : "text-gray-500 hover:text-gray-300"}`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-[hsl(220,13%,11%)] border border-[hsl(220,13%,19%)] rounded-2xl p-5">
        {tab === "position-size" && <PositionSizer />}
        {tab === "option-greeks" && <OptionGreeks />}
        {tab === "pivot-fibonacci" && <PivotFibonacci />}
      </div>
    </div>
  );
}
