import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSignals, createSignal, updateSignal, deleteSignal, fetchSubscriptions, updateSubscription, fetchUpstoxStatus, fetchUpstoxOptionChain, type Signal, type Subscription, type UpstoxStatus, type UpstoxOptionChain } from "@/lib/api";
import { useAdmin } from "@/hooks/use-admin";

const SEGMENTS = ["nifty", "banknifty", "options", "futures", "equity", "intraday", "commodity", "currency"] as const;
const SIGNAL_TYPES = ["buy", "sell"] as const;

type AdminProps = { onBack: () => void };

// ─── Upstox Panel ─────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, d = 2): string {
  if (v == null) return "–";
  return v.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
}

function fmtOI(v: number | null | undefined): string {
  if (v == null) return "–";
  if (Math.abs(v) >= 1_00_000) return (v / 1_00_000).toFixed(2) + "L";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

function UpstoxPanel({ adminToken }: { adminToken: string }) {
  const [accessToken, setAccessToken] = useState(localStorage.getItem("upstox_access_token") ?? "");
  const [tokenInput, setTokenInput] = useState("");
  const [segment, setSegment] = useState("NIFTY");
  const [chainLoading, setChainLoading] = useState(false);
  const [chainData, setChainData] = useState<UpstoxOptionChain | null>(null);
  const [chainError, setChainError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [showStrikes, setShowStrikes] = useState(false);

  const { data: status, refetch: refetchStatus } = useQuery<UpstoxStatus>({
    queryKey: ["upstox-status", adminToken],
    queryFn: () => fetchUpstoxStatus(adminToken),
    staleTime: 30000,
  });

  function saveToken() {
    if (!tokenInput.trim()) return;
    localStorage.setItem("upstox_access_token", tokenInput.trim());
    setAccessToken(tokenInput.trim());
    setTokenInput("");
    setSaveMsg("Access token saved locally ✓");
    setTimeout(() => setSaveMsg(""), 3000);
    refetchStatus();
  }

  function clearToken() {
    localStorage.removeItem("upstox_access_token");
    setAccessToken("");
    setSaveMsg("Token cleared");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function openAuthUrl() {
    try {
      const r = await fetch(`/api/trademaster/upstox/auth-url`, {
        headers: { "Authorization": `Bearer ${adminToken}` },
      });
      const data = await r.json() as { url: string; redirectUri: string };
      window.open(data.url, "_blank");
      setShowAuth(true);
      setAuthMsg(`After login, copy the 'code' parameter from the redirect URL and paste below.`);
    } catch {
      setAuthMsg("Failed to get auth URL — check UPSTOX_API_KEY is configured.");
    }
  }

  async function exchangeCode() {
    if (!authCode.trim()) return;
    try {
      const r = await fetch(`/api/trademaster/upstox/token`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: authCode.trim() }),
      });
      const data = await r.json() as { ok: boolean; access_token?: string; error?: string };
      if (data.ok && data.access_token) {
        localStorage.setItem("upstox_access_token", data.access_token);
        setAccessToken(data.access_token);
        setAuthMsg("✅ Access token obtained and saved!");
        setShowAuth(false);
        setAuthCode("");
        refetchStatus();
      } else {
        setAuthMsg(`❌ ${data.error ?? "Token exchange failed"}`);
      }
    } catch {
      setAuthMsg("❌ Token exchange failed");
    }
  }

  async function fetchChain() {
    setChainLoading(true);
    setChainError("");
    setChainData(null);
    try {
      const data = await fetchUpstoxOptionChain(adminToken, segment, accessToken || undefined);
      setChainData(data);
    } catch (err) {
      setChainError(err instanceof Error ? err.message : "Failed to fetch option chain");
    } finally {
      setChainLoading(false);
    }
  }

  const isConnected = status?.connected;
  const hasToken = !!accessToken;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-6">
        <h2 className="text-white font-semibold text-lg mb-4">🔗 Upstox Live Data</h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "API Key", ok: status?.apiKeyConfigured },
            { label: "API Secret", ok: status?.apiSecretConfigured },
            { label: "Access Token (local)", ok: hasToken },
            { label: "Connection", ok: isConnected },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center justify-between bg-[hsl(220,13%,16%)] rounded-lg px-3 py-2">
              <span className="text-xs text-gray-400">{label}</span>
              <span className={`text-xs font-bold ${ok ? "text-green-400" : "text-red-400"}`}>{ok ? "✓ OK" : "✗ Missing"}</span>
            </div>
          ))}
        </div>

        {isConnected && status?.user && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 mb-4">
            <div className="text-green-400 text-sm font-semibold">Connected to Upstox</div>
            <div className="text-gray-400 text-xs mt-1">{status.user.name} · {status.user.email} · {status.user.broker}</div>
          </div>
        )}

        {status && !isConnected && status.message && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 mb-4 text-yellow-400 text-sm">
            {status.message}
          </div>
        )}

        {/* Manual token input */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Upstox Access Token (Daily)</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={hasToken ? "Token saved — paste new to replace" : "Paste your Upstox access token here"}
                className="flex-1 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
              />
              <button
                onClick={saveToken}
                disabled={!tokenInput.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Save
              </button>
              {hasToken && (
                <button onClick={clearToken} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-lg transition-colors">
                  Clear
                </button>
              )}
            </div>
            {saveMsg && <p className="text-green-400 text-xs mt-1">{saveMsg}</p>}
            <p className="text-gray-600 text-xs mt-1">Token is stored in your browser only. Upstox tokens expire daily — refresh each morning.</p>
          </div>

          {/* OAuth Flow */}
          <div className="border-t border-[hsl(220,13%,20%)] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Don't have a token? Use the Upstox login flow.</span>
              <button
                onClick={openAuthUrl}
                disabled={!status?.apiKeyConfigured}
                className="px-3 py-1.5 text-xs bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-40"
              >
                Open Upstox Login ↗
              </button>
            </div>
            {showAuth && (
              <div className="mt-3 space-y-2">
                {authMsg && <p className="text-yellow-400 text-xs">{authMsg}</p>}
                <div className="flex gap-2">
                  <input
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste authorization code from redirect URL"
                    className="flex-1 bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={exchangeCode}
                    disabled={!authCode.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded-lg"
                  >
                    Exchange
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Option Chain Fetcher */}
      <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-6">
        <h2 className="text-white font-semibold text-lg mb-4">📊 Live Option Chain</h2>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Index</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value="NIFTY">Nifty 50</option>
              <option value="BANKNIFTY">Bank Nifty</option>
              <option value="FINNIFTY">Nifty FinServ</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchChain}
              disabled={chainLoading || !hasToken}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {chainLoading ? "Fetching…" : "Fetch Live Data"}
            </button>
          </div>
        </div>

        {!hasToken && (
          <p className="text-yellow-400 text-xs mb-4">⚠️ Save an Upstox access token above to fetch live data.</p>
        )}

        {chainError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
            ❌ {chainError}
          </div>
        )}

        {chainData && (
          <div className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "PCR (OI)", value: chainData.pcr != null ? chainData.pcr.toFixed(3) : "–", color: chainData.pcr != null ? (chainData.pcr > 1.2 ? "text-green-400" : chainData.pcr < 0.8 ? "text-red-400" : "text-white") : "text-gray-500" },
                { label: "ATM Strike", value: chainData.atmStrike > 0 ? chainData.atmStrike.toLocaleString("en-IN") : "–", color: "text-blue-400" },
                { label: "Max Pain", value: chainData.maxPain > 0 ? chainData.maxPain.toLocaleString("en-IN") : "–", color: "text-yellow-400" },
                { label: "CE Wall", value: chainData.maxCallStrike > 0 ? chainData.maxCallStrike.toLocaleString("en-IN") : "–", color: "text-red-400" },
                { label: "PE Wall", value: chainData.maxPutStrike > 0 ? chainData.maxPutStrike.toLocaleString("en-IN") : "–", color: "text-green-400" },
                { label: "ATM CE LTP", value: chainData.atmLTP.ce != null ? `₹${fmt(chainData.atmLTP.ce)}` : "–", color: "text-white" },
                { label: "ATM PE LTP", value: chainData.atmLTP.pe != null ? `₹${fmt(chainData.atmLTP.pe)}` : "–", color: "text-white" },
                { label: "PCR OI Chg", value: chainData.pcrOiChange != null ? chainData.pcrOiChange.toFixed(3) : "–", color: "text-gray-300" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[hsl(220,13%,16%)] rounded-lg px-3 py-2.5">
                  <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                  <div className={`text-base font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-600">
              Fetched: {new Date(chainData.fetchedAt).toLocaleTimeString("en-IN")} · Expiry: {chainData.expiry} · Total CE OI: {fmtOI(chainData.totalCallOI)} · Total PE OI: {fmtOI(chainData.totalPutOI)}
            </div>

            {/* Strike table toggle */}
            <button
              onClick={() => setShowStrikes(!showStrikes)}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              {showStrikes ? "Hide" : "Show"} full strike table ({chainData.strikes.length} strikes)
            </button>

            {showStrikes && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[hsl(220,13%,20%)]">
                      {["CE OI Chg", "CE OI", "CE LTP", "Strike", "PE LTP", "PE OI", "PE OI Chg"].map((h) => (
                        <th key={h} className="text-gray-500 font-semibold px-2 py-2 text-right first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chainData.strikes.map((row) => (
                      <tr key={row.strike} className={`border-b border-[hsl(220,13%,18%)] ${row.isATM ? "bg-blue-500/10" : ""}`}>
                        <td className={`px-2 py-1.5 text-right ${(row.ce.oiChange ?? 0) > 0 ? "text-red-400" : "text-green-400"}`}>{fmtOI(row.ce.oiChange)}</td>
                        <td className="px-2 py-1.5 text-right text-gray-300">{fmtOI(row.ce.oi)}</td>
                        <td className="px-2 py-1.5 text-right text-white font-semibold">{fmt(row.ce.ltp)}</td>
                        <td className={`px-2 py-1.5 text-center font-bold ${row.isATM ? "text-blue-400" : "text-gray-200"}`}>{row.strike.toLocaleString("en-IN")}{row.isATM ? " ◀" : ""}</td>
                        <td className="px-2 py-1.5 text-left text-white font-semibold">{fmt(row.pe.ltp)}</td>
                        <td className="px-2 py-1.5 text-left text-gray-300">{fmtOI(row.pe.oi)}</td>
                        <td className={`px-2 py-1.5 text-left ${(row.pe.oiChange ?? 0) > 0 ? "text-green-400" : "text-red-400"}`}>{fmtOI(row.pe.oiChange)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions card */}
      <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 text-sm">📖 How to get your Upstox Access Token</h3>
        <ol className="space-y-2 text-xs text-gray-400 list-none">
          {[
            "Register your app at developer.upstox.com — your API Key & Secret are now configured in Replit.",
            'Set your Redirect URI in Upstox Developer Console (e.g. http://localhost:3000 for testing).',
            'Click "Open Upstox Login" above → log in → copy the code= value from the redirect URL.',
            "Paste the code and click Exchange — your access token is saved automatically.",
            "Tokens expire daily. Repeat each morning before the 9:15 AM NSE opening.",
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-green-500 font-bold flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

type FormData = {
  segment: string;
  assetName: string;
  signalType: string;
  entryPrice: string;
  stopLoss: string;
  target1: string;
  target2: string;
  iv: string;
  pcr: string;
  notes: string;
  isPremium: boolean;
};

const EMPTY_FORM: FormData = {
  segment: "intraday", assetName: "", signalType: "buy",
  entryPrice: "", stopLoss: "", target1: "", target2: "",
  iv: "", pcr: "", notes: "", isPremium: false,
};

type AdminTab = "signals" | "subscriptions" | "upstox";

export default function Admin({ onBack }: AdminProps) {
  const { isAdmin, adminToken, login, logout } = useAdmin();
  const [tokenInput, setTokenInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("signals");
  const queryClient = useQueryClient();

  const { data: signalsData } = useQuery({
    queryKey: ["signals", "all"],
    queryFn: () => fetchSignals(),
    enabled: isAdmin,
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => fetchSubscriptions(adminToken!),
    enabled: isAdmin && !!adminToken && activeTab === "subscriptions",
  });

  const signals: Signal[] = signalsData?.signals ?? [];
  const subscriptions: Subscription[] = subsData?.subscriptions ?? [];

  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) { setLoginError("Please enter the admin token"); return; }
    setLoginLoading(true);
    setLoginError("");
    const valid = await login(tokenInput.trim());
    if (!valid) setLoginError("Invalid admin token");
    setLoginLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSubmitError(""); setSubmitSuccess("");
    try {
      const payload: Record<string, unknown> = {
        segment: form.segment, assetName: form.assetName, signalType: form.signalType,
        entryPrice: parseFloat(form.entryPrice), stopLoss: parseFloat(form.stopLoss),
        target1: parseFloat(form.target1), isPremium: form.isPremium,
      };
      if (form.target2) payload.target2 = parseFloat(form.target2);
      if (form.iv) payload.iv = form.iv;
      if (form.pcr) payload.pcr = form.pcr;
      if (form.notes) payload.notes = form.notes;

      if (editingId !== null) {
        await updateSignal(editingId, payload, adminToken);
        setSubmitSuccess("Signal updated!");
        setEditingId(null);
      } else {
        await createSignal(payload, adminToken);
        setSubmitSuccess("Signal posted!");
      }
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleEdit = (signal: Signal) => {
    setEditingId(signal.id);
    setForm({
      segment: signal.segment, assetName: signal.assetName, signalType: signal.signalType,
      entryPrice: signal.entryPrice, stopLoss: signal.stopLoss, target1: signal.target1,
      target2: signal.target2 ?? "", iv: signal.iv ?? "", pcr: signal.pcr ?? "",
      notes: signal.notes ?? "",
      isPremium: signal.isPremium,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!adminToken || !confirm("Delete this signal?")) return;
    try {
      await deleteSignal(id, adminToken);
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    if (!adminToken) return;
    try {
      await updateSignal(id, { status }, adminToken);
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleSubStatus = async (id: number, status: string) => {
    if (!adminToken) return;
    try {
      await updateSubscription(id, status, adminToken);
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[hsl(220,13%,9%)] flex items-center justify-center p-4">
        <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h2 className="text-white text-xl font-bold">Admin Access</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your admin token to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Admin Token"
              className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
              {loginLoading ? "Verifying…" : "Login"}
            </button>
            <button type="button" onClick={onBack} className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">← Back to Signals</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage signals & subscriptions</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onBack} className="text-sm text-gray-400 hover:text-white px-4 py-2 bg-[hsl(220,13%,16%)] rounded-lg border border-[hsl(220,13%,25%)] transition-colors">← Back</button>
            <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/30 transition-colors">Logout</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["signals", "subscriptions", "upstox"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? "bg-green-600 text-white" : "bg-[hsl(220,13%,16%)] text-gray-400 hover:text-white"
              }`}
            >
              {tab === "signals" ? `📊 Signals (${signals.length})` : tab === "subscriptions" ? `💳 Subscriptions` : `🔗 Upstox Live`}
            </button>
          ))}
        </div>

        {activeTab === "signals" && (
          <>
            <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-6 mb-6">
              <h2 className="text-white font-semibold text-lg mb-4">
                {editingId !== null ? "✏️ Edit Signal" : "➕ Post New Signal"}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Segment</label>
                  <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })}
                    className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-green-500">
                    {SEGMENTS.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Signal Type</label>
                  <select value={form.signalType} onChange={(e) => setForm({ ...form, signalType: e.target.value })}
                    className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-green-500">
                    {SIGNAL_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Asset Name</label>
                  <input type="text" required value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })}
                    placeholder="e.g. NIFTY 24500 CE, RELIANCE, GOLD"
                    className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500" />
                </div>
                {[
                  { label: "Entry Price", key: "entryPrice" as const, required: true },
                  { label: "Stop Loss", key: "stopLoss" as const, required: true },
                  { label: "Target 1", key: "target1" as const, required: true },
                  { label: "Target 2 (optional)", key: "target2" as const, required: false },
                  { label: "IV (options, optional)", key: "iv" as const, required: false, text: true },
                  { label: "PCR (options, optional)", key: "pcr" as const, required: false, text: true },
                ].map(({ label, key, required, text }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                    <input
                      type={text ? "text" : "number"} required={required} step="0.01"
                      value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={text ? (key === "iv" ? "e.g. 18.5%" : "e.g. 1.2") : "₹"}
                      className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500" />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Analyst Commentary / Notes (optional)</label>
                  <textarea
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Strong support at 2895 EMA. FII buying visible. Trade between 9:30–2:00 PM."
                    rows={2}
                    className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,25%)] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 resize-none text-sm"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="isPremium" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} className="w-4 h-4 accent-green-500" />
                  <label htmlFor="isPremium" className="text-sm text-gray-300">Professional Signal (requires subscription to view)</label>
                </div>
                {submitError && <div className="md:col-span-2 text-red-400 text-sm">{submitError}</div>}
                {submitSuccess && <div className="md:col-span-2 text-green-400 text-sm">{submitSuccess}</div>}
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors">
                    {editingId !== null ? "Update Signal" : "Post Signal"}
                  </button>
                  {editingId !== null && (
                    <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}
                      className="px-6 bg-[hsl(220,13%,16%)] hover:bg-[hsl(220,13%,20%)] text-gray-300 font-semibold py-3 rounded-lg border border-[hsl(220,13%,25%)] transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">Posted Signals ({signals.length})</h2>
              {signals.length === 0 ? (
                <p className="text-gray-600 text-sm">No signals yet. Post the first one above.</p>
              ) : (
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${signal.signalType === "buy" ? "text-green-400" : "text-red-400"}`}>{signal.signalType.toUpperCase()}</span>
                          <span className="text-white font-semibold text-sm">{signal.assetName}</span>
                          <span className="text-xs text-gray-500 uppercase">{signal.segment}</span>
                          {signal.isPremium && <span className="text-xs text-yellow-400">⭐ Premium</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Entry: ₹{signal.entryPrice} · SL: ₹{signal.stopLoss} · T1: ₹{signal.target1}
                        </div>
                        <div className={`text-xs mt-0.5 ${signal.status === "active" ? "text-blue-400" : signal.status === "target_hit" ? "text-green-400" : "text-red-400"}`}>
                          {signal.status === "active" ? "Active" : signal.status === "target_hit" ? "✅ Target Hit" : "❌ SL Hit"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {signal.status === "active" && (
                          <>
                            <button onClick={() => handleStatusUpdate(signal.id, "target_hit")} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 bg-green-500/10 rounded border border-green-500/20">✅ T.Hit</button>
                            <button onClick={() => handleStatusUpdate(signal.id, "sl_hit")} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded border border-red-500/20">❌ SL Hit</button>
                          </>
                        )}
                        <button onClick={() => handleEdit(signal)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-500/10 rounded border border-blue-500/20">Edit</button>
                        <button onClick={() => handleDelete(signal.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded border border-red-500/20">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "upstox" && adminToken && (
          <UpstoxPanel adminToken={adminToken} />
        )}

        {activeTab === "subscriptions" && (
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Premium Subscriptions</h2>
              {subsData && (
                <span className="text-xs text-gray-500">{subsData.total} total</span>
              )}
            </div>
            {subsLoading ? (
              <div className="text-gray-500 text-sm">Loading…</div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">💳</div>
                <p className="text-gray-600 text-sm">No subscriptions yet.</p>
                <p className="text-gray-700 text-xs mt-1">Subscribers will appear here after checkout.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,22%)] rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            sub.status === "active" ? "bg-green-500/20 text-green-400" :
                            sub.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                            "bg-gray-500/20 text-gray-400"
                          }`}>
                            {sub.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">#{sub.id}</span>
                        </div>
                        <div className="text-white text-sm font-medium truncate">{sub.email ?? "—"}</div>
                        {sub.stripeCustomerId && (
                          <div className="text-xs text-gray-600 mt-0.5 font-mono truncate">{sub.stripeCustomerId}</div>
                        )}
                        {sub.stripeSubscriptionId && (
                          <div className="text-xs text-gray-600 mt-0.5 font-mono truncate">{sub.stripeSubscriptionId}</div>
                        )}
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(sub.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {sub.status === "active" && (
                          <button
                            onClick={() => handleSubStatus(sub.id, "cancelled")}
                            className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 rounded border border-red-500/20 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {sub.status === "cancelled" && (
                          <button
                            onClick={() => handleSubStatus(sub.id, "active")}
                            className="text-xs text-green-400 hover:text-green-300 px-3 py-1.5 bg-green-500/10 rounded border border-green-500/20 transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[hsl(220,13%,22%)]">
                      <div className="text-xs text-gray-600 font-mono break-all">Session: {sub.sessionId}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
