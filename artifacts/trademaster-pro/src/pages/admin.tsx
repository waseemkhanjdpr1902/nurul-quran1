import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSignals, createSignal, updateSignal, deleteSignal, fetchSubscriptions, updateSubscription, type Signal, type Subscription } from "@/lib/api";
import { useAdmin } from "@/hooks/use-admin";

const SEGMENTS = ["nifty", "banknifty", "options", "equity", "intraday", "commodity", "currency"] as const;
const SIGNAL_TYPES = ["buy", "sell"] as const;

type AdminProps = { onBack: () => void };

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

type AdminTab = "signals" | "subscriptions";

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

        <div className="flex gap-2 mb-6">
          {(["signals", "subscriptions"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? "bg-green-600 text-white" : "bg-[hsl(220,13%,16%)] text-gray-400 hover:text-white"
              }`}
            >
              {tab === "signals" ? `📊 Signals (${signals.length})` : `💳 Subscriptions`}
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
