"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import {
  RefreshCw, Zap, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Activity, Webhook, Plus, Trash2, Copy, BarChart3
} from "lucide-react";

interface SignalState {
  segment: string;
  signal: string;
  price: string;
  ema9: string;
  vwap: string;
  rsi: string;
  pcr: string | null;
  volume_ratio: string;
  volume_confirmed: boolean;
  delta: string | null;
  candle_high: string;
  candle_low: string;
  updated_at: string;
  dataLag: boolean;
}

interface SignalsResponse {
  ok: boolean;
  signals: SignalState[];
  fetchedAt: string;
}

interface WebhookRow {
  id: number;
  name: string;
  url: string;
  platform: string;
  is_active: boolean;
  last_fired_at: string | null;
  last_status_code: number | null;
}

function fmt(v: string | null | undefined, decimals = 2): string {
  if (v == null) return "–";
  const n = parseFloat(v);
  return isNaN(n) ? "–" : n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function SignalBadge({ signal }: { signal: string }) {
  if (signal === "buy")
    return <span className="badge badge-buy"><TrendingUp size={11} /> BUY</span>;
  if (signal === "sell")
    return <span className="badge badge-sell"><TrendingDown size={11} /> SELL</span>;
  return <span className="badge badge-neutral"><Minus size={11} /> NEUTRAL</span>;
}

function RsiBar({ rsi }: { rsi: number }) {
  const clamp = Math.max(0, Math.min(100, rsi));
  const color = rsi > 70 ? "#ef4444" : rsi < 30 ? "#22c55e" : "#3b82f6";
  return (
    <div style={{ position: "relative", width: "100%", height: 6, background: "#1e2535", borderRadius: 3 }}>
      <div style={{ width: `${clamp}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function SignalCard({ s }: { s: SignalState }) {
  const rsi = parseFloat(s.rsi) || 50;
  const priceNum = parseFloat(s.price);
  const ema9Num = parseFloat(s.ema9);
  const vwapNum = parseFloat(s.vwap);
  const priceVsEma = priceNum > ema9Num ? "above" : "below";
  const priceVsVwap = priceNum > vwapNum ? "above" : "below";

  const borderColor =
    s.signal === "buy" ? "rgba(34,197,94,0.4)" :
    s.signal === "sell" ? "rgba(239,68,68,0.4)" : "var(--border)";

  function whatsapp() {
    const emoji = s.signal === "buy" ? "🟢" : s.signal === "sell" ? "🔴" : "⚪";
    const text =
      `${emoji} *${s.segment} ${s.signal.toUpperCase()} SIGNAL*\n` +
      `💰 LTP: ₹${fmt(s.price)}\n` +
      `📊 9 EMA: ₹${fmt(s.ema9)}\n` +
      `📈 VWAP: ₹${fmt(s.vwap)}\n` +
      `💹 RSI(14): ${fmt(s.rsi, 1)}\n` +
      (s.pcr ? `🔗 PCR: ${fmt(s.pcr, 2)}\n` : "") +
      (s.volume_confirmed ? `🔊 Volume Spike: YES ✅\n` : "") +
      `⏱ Updated: ${timeAgo(s.updated_at)}\n` +
      `\n_TradeMaster Pro Signal Engine_`;
    navigator.clipboard.writeText(text).then(() => toast.success("Copied for WhatsApp!"));
  }

  return (
    <div className="card" style={{ borderColor, position: "relative", overflow: "hidden" }}>
      {s.dataLag && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--accent-yellow)" }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{s.segment}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.5, marginTop: 2 }}>
            ₹{fmt(s.price)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <SignalBadge signal={s.signal} />
          {s.dataLag && <span className="badge badge-lag"><AlertTriangle size={10} /> DATA LAG</span>}
          {s.volume_confirmed && <span className="badge badge-spike"><Activity size={10} /> VOL SPIKE</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>9 EMA</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: priceVsEma === "above" ? "#22c55e" : "#ef4444" }}>
            ₹{fmt(s.ema9)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>VWAP</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: priceVsVwap === "above" ? "#22c55e" : "#ef4444" }}>
            ₹{fmt(s.vwap)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>PCR</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{s.pcr ? fmt(s.pcr, 2) : "–"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Vol Ratio</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(s.volume_ratio, 2)}×</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>ATM Delta</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{s.delta ? fmt(s.delta, 3) : "0.500"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Candle Range</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(s.candle_low)} – {fmt(s.candle_high)}</div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 4 }}>
          <span>RSI(14): {fmt(s.rsi, 1)}</span>
          <span>{rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Neutral"}</span>
        </div>
        <RsiBar rsi={rsi} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569" }}>{timeAgo(s.updated_at)}</span>
        <button
          onClick={whatsapp}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
            borderRadius: 6, background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
            color: "#25d366", fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}
        >
          <Copy size={12} /> WhatsApp
        </button>
      </div>
    </div>
  );
}

function WebhookPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", url: "", platform: "generic", secret: "" });
  const { data } = useQuery<{ ok: boolean; webhooks: WebhookRow[] }>({
    queryKey: ["webhooks"],
    queryFn: () => fetch("/api/webhooks").then((r) => r.json()),
    staleTime: 60000,
  });

  const addMut = useMutation({
    mutationFn: (body: typeof form) =>
      fetch("/api/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); toast.success("Webhook added"); setForm({ name: "", url: "", platform: "generic", secret: "" }); },
    onError: () => toast.error("Failed to add webhook"),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/webhooks?id=${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); toast.success("Webhook deleted"); },
  });

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 15, fontWeight: 700 }}>
        <Webhook size={16} color="#3b82f6" /> Webhook Dispatch
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Name", key: "name", placeholder: "My Tradetron Bot" },
          { label: "URL", key: "url", placeholder: "https://tradetron.tech/api/..." },
          { label: "Secret (optional)", key: "secret", placeholder: "shared-secret" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
            <input
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                background: "#0a0d13", border: "1px solid #1e2535", color: "#e2e8f0",
                fontSize: 13, outline: "none"
              }}
            />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Platform</label>
          <select
            value={form.platform}
            onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 6,
              background: "#0a0d13", border: "1px solid #1e2535", color: "#e2e8f0", fontSize: 13
            }}
          >
            <option value="generic">Generic JSON</option>
            <option value="sensibull">Sensibull</option>
            <option value="tradetron">Tradetron</option>
          </select>
        </div>
        <button
          onClick={() => addMut.mutate(form)}
          disabled={!form.name || !form.url || addMut.isPending}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 16px", borderRadius: 6, background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", fontWeight: 600,
            fontSize: 13, cursor: "pointer", opacity: !form.name || !form.url ? 0.5 : 1
          }}
        >
          <Plus size={14} /> Add Webhook
        </button>
      </div>

      {data?.webhooks && data.webhooks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.webhooks.map((wh) => (
            <div key={wh.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#0a0d13", borderRadius: 6, border: "1px solid #1e2535" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{wh.name}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{wh.platform} · {wh.last_fired_at ? `last: ${timeAgo(wh.last_fired_at)}` : "never fired"} {wh.last_status_code ? `(${wh.last_status_code})` : ""}</div>
              </div>
              <button
                onClick={() => delMut.mutate(wh.id)}
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SignalDashboard() {
  const qc = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"signals" | "webhooks">("signals");

  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useQuery<SignalsResponse>({
    queryKey: ["signals"],
    queryFn: async () => {
      const r = await fetch("/api/signals");
      const json = await r.json();
      setLastRefresh(new Date());
      return json;
    },
  });

  const triggerMut = useMutation({
    mutationFn: () =>
      fetch("/api/generate-signals", { method: "POST" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`Signal engine ran — ${res.results?.length ?? 0} segment(s) updated`);
        qc.invalidateQueries({ queryKey: ["signals"] });
      } else {
        toast.error("Engine returned error");
      }
    },
    onError: () => toast.error("Failed to trigger engine"),
  });

  const hasLag = data?.signals?.some((s) => s.dataLag);
  const buyCount = data?.signals?.filter((s) => s.signal === "buy").length ?? 0;
  const sellCount = data?.signals?.filter((s) => s.signal === "sell").length ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "0 0 40px" }}>
      <div style={{ background: "linear-gradient(135deg, #0f1928 0%, #0a0d13 100%)", borderBottom: "1px solid #1e2535", padding: "16px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BarChart3 size={22} color="#3b82f6" />
                <span style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>TradeMaster Pro</span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>9 EMA · VWAP · RSI · Cron every 3 min</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!isLoading && !isError && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                  <div className={isFetching ? "pulse" : "live-dot"} />
                  {isFetching ? "Refreshing…" : "LIVE"}
                </div>
              )}
              <button
                onClick={() => triggerMut.mutate()}
                disabled={triggerMut.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 8, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
                  color: "#3b82f6", fontWeight: 600, fontSize: 13, cursor: "pointer"
                }}
              >
                <Zap size={14} className={triggerMut.isPending ? "pulse" : ""} />
                {triggerMut.isPending ? "Running…" : "Run Engine"}
              </button>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["signals"] })}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "8px 10px",
                  borderRadius: 8, background: "#10151f", border: "1px solid #1e2535",
                  color: "#64748b", cursor: "pointer"
                }}
              >
                <RefreshCw size={14} className={isFetching ? "pulse" : ""} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {[
              { label: "BUY Signals", value: buyCount, color: "#22c55e" },
              { label: "SELL Signals", value: sellCount, color: "#ef4444" },
              { label: "Segments", value: data?.signals?.length ?? "–", color: "#3b82f6" },
              { label: "Last Update", value: lastRefresh ? timeAgo(lastRefresh.toISOString()) : "–", color: "#94a3b8" },
            ].map((stat) => (
              <div key={stat.label} style={{ padding: "8px 14px", background: "rgba(30,37,53,0.7)", borderRadius: 8, border: "1px solid #1e2535" }}>
                <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginBottom: 2 }}>{stat.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {hasLag && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 8 }}>
              <AlertTriangle size={14} color="#eab308" />
              <span style={{ fontSize: 12, color: "#eab308" }}>Data Lag Detected — Some signals may be stale. The engine will auto-refresh within 3 minutes.</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["signals", "webhooks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
                background: activeTab === tab ? "rgba(59,130,246,0.15)" : "#10151f",
                border: activeTab === tab ? "1px solid rgba(59,130,246,0.4)" : "1px solid #1e2535",
                color: activeTab === tab ? "#3b82f6" : "#64748b",
              }}
            >
              {tab === "signals" ? "📊 Live Signals" : "🔗 Webhooks"}
            </button>
          ))}
        </div>

        {activeTab === "signals" && (
          <>
            {isLoading && (
              <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
                <div className="pulse" style={{ width: 32, height: 32, background: "#1e2535", borderRadius: 8, margin: "0 auto 12px" }} />
                Loading signal engine…
              </div>
            )}
            {isError && (
              <div style={{ textAlign: "center", padding: 60, color: "#ef4444" }}>
                <AlertTriangle size={32} style={{ margin: "0 auto 12px", display: "block" }} />
                Failed to connect to signal engine.
              </div>
            )}
            {!isLoading && !isError && data?.signals?.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
                <Zap size={32} style={{ margin: "0 auto 12px", display: "block" }} />
                <div style={{ marginBottom: 12 }}>No signals yet. Click "Run Engine" to generate your first signals.</div>
                <button
                  onClick={() => triggerMut.mutate()}
                  disabled={triggerMut.isPending}
                  style={{
                    padding: "10px 24px", borderRadius: 8, background: "#3b82f6", border: "none",
                    color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer"
                  }}
                >
                  {triggerMut.isPending ? "Running…" : "Run Signal Engine Now"}
                </button>
              </div>
            )}
            {data?.signals && data.signals.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {data.signals.map((s) => <SignalCard key={s.segment} s={s} />)}
              </div>
            )}

            {data?.signals && data.signals.length > 0 && (
              <div className="card" style={{ marginTop: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#94a3b8" }}>📋 Signal Status Table</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e2535" }}>
                        {["Segment", "Signal", "LTP", "9 EMA", "VWAP", "RSI", "PCR", "Vol ×", "Delta", "Updated"].map((h) => (
                          <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.signals.map((s) => (
                        <tr key={s.segment} style={{ borderBottom: "1px solid #0f1928" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 700 }}>{s.segment}</td>
                          <td style={{ padding: "8px 10px" }}><SignalBadge signal={s.signal} /></td>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>₹{fmt(s.price)}</td>
                          <td style={{ padding: "8px 10px", color: parseFloat(s.price) > parseFloat(s.ema9) ? "#22c55e" : "#ef4444" }}>₹{fmt(s.ema9)}</td>
                          <td style={{ padding: "8px 10px", color: parseFloat(s.price) > parseFloat(s.vwap) ? "#22c55e" : "#ef4444" }}>₹{fmt(s.vwap)}</td>
                          <td style={{ padding: "8px 10px" }}>{fmt(s.rsi, 1)}</td>
                          <td style={{ padding: "8px 10px" }}>{s.pcr ? fmt(s.pcr, 2) : "–"}</td>
                          <td style={{ padding: "8px 10px" }}>{fmt(s.volume_ratio, 2)}×</td>
                          <td style={{ padding: "8px 10px" }}>{s.delta ? fmt(s.delta, 3) : "0.500"}</td>
                          <td style={{ padding: "8px 10px", color: "#475569", fontSize: 11 }}>{timeAgo(s.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "#334155" }}>
                  Auto-refresh every 30s · Cron runs every 3 min on Vercel · State-change dedup enabled
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "webhooks" && <WebhookPanel />}
      </div>
    </div>
  );
}
