import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJournal, addJournalTrade, updateJournalTrade, deleteJournalTrade, type JournalTrade } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = "trademaster_session_id";

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) { sid = `tm_${Date.now()}_${Math.random().toString(36).slice(2)}`; localStorage.setItem(SESSION_KEY, sid); }
  return sid;
}

const ASSET_TYPES = ["equity", "intraday", "options", "futures", "commodity", "currency", "crypto"];
const STRATEGIES = ["Breakout", "Reversal", "Trend Following", "Scalping", "Swing Trade", "Price Action", "Support/Resistance", "VWAP", "Moving Average", "RSI Divergence", "Other"];

const outcomeColors: Record<string, string> = {
  win: "text-green-400 bg-green-500/10 border-green-500/30",
  loss: "text-red-400 bg-red-500/10 border-red-500/30",
  breakeven: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  open: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const outcomeLabels: Record<string, string> = { win: "✅ Win", loss: "❌ Loss", breakeven: "🟡 B/E", open: "⏳ Open" };

type FormState = {
  assetName: string;
  assetType: string;
  direction: "long" | "short";
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  strategyUsed: string;
  notes: string;
  entryDate: string;
  exitDate: string;
};

const defaultForm: FormState = {
  assetName: "", assetType: "equity", direction: "long",
  entryPrice: "", exitPrice: "", quantity: "",
  strategyUsed: "", notes: "",
  entryDate: new Date().toISOString().slice(0, 16),
  exitDate: "",
};

type CloseFormState = { exitPrice: string; exitDate: string; notes: string; strategyUsed: string };

export default function Journal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionId] = useState(getSessionId);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [closeTradeId, setCloseTradeId] = useState<number | null>(null);
  const [closeForm, setCloseForm] = useState<CloseFormState>({ exitPrice: "", exitDate: new Date().toISOString().slice(0, 16), notes: "", strategyUsed: "" });
  const [filterOutcome, setFilterOutcome] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["journal", sessionId],
    queryFn: () => fetchJournal(sessionId),
  });

  const addMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => addJournalTrade(d),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      void queryClient.invalidateQueries({ queryKey: ["journalAnalytics"] });
      setShowAdd(false);
      setForm(defaultForm);
      toast({ title: "Trade logged!", description: "Your trade has been saved to the journal." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateJournalTrade(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      void queryClient.invalidateQueries({ queryKey: ["journalAnalytics"] });
      setCloseTradeId(null);
      toast({ title: "Trade closed!", description: "P&L has been calculated and saved." });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteJournalTrade(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
      void queryClient.invalidateQueries({ queryKey: ["journalAnalytics"] });
      toast({ title: "Trade deleted" });
    },
  });

  const trades = data?.trades ?? [];
  const filtered = filterOutcome === "all" ? trades : trades.filter(t => t.outcome === filterOutcome);
  const totalPnl = trades.filter(t => t.pnl).reduce((s, t) => s + parseFloat(t.pnl!), 0);
  const wins = trades.filter(t => t.outcome === "win").length;
  const closed = trades.filter(t => t.outcome !== "open").length;
  const winRate = closed > 0 ? ((wins / closed) * 100).toFixed(0) : "—";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assetName.trim() || !form.entryPrice || !form.quantity) return;
    addMutation.mutate({
      sessionId, assetName: form.assetName, assetType: form.assetType,
      direction: form.direction, entryPrice: form.entryPrice,
      exitPrice: form.exitPrice || undefined, quantity: parseInt(form.quantity, 10),
      strategyUsed: form.strategyUsed || undefined, notes: form.notes || undefined,
      entryDate: form.entryDate, exitDate: form.exitDate || undefined,
    });
  }

  function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (closeTradeId === null || !closeForm.exitPrice) return;
    const trade = trades.find(t => t.id === closeTradeId);
    closeMutation.mutate({ id: closeTradeId, data: {
      exitPrice: closeForm.exitPrice,
      exitDate: closeForm.exitDate,
      notes: closeForm.notes || trade?.notes || undefined,
      strategyUsed: closeForm.strategyUsed || trade?.strategyUsed || undefined,
    }});
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">My Trading Journal</h1>
          <p className="text-gray-500 text-sm mt-0.5">Log trades · Track P&amp;L · Improve your edge</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          + Log Trade
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Trades", value: trades.length.toString(), icon: "📋" },
          { label: "Win Rate", value: `${winRate}%`, icon: "🎯" },
          { label: "Total P&L", value: `₹${totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: "💰", color: totalPnl >= 0 ? "text-green-400" : "text-red-400" },
          { label: "Open Trades", value: trades.filter(t => t.outcome === "open").length.toString(), icon: "⏳" },
        ].map(s => (
          <div key={s.label} className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-3">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className={`text-xl font-black ${s.color ?? "text-white"}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "open", "win", "loss", "breakeven"].map(f => (
          <button
            key={f}
            onClick={() => setFilterOutcome(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${filterOutcome === f ? "bg-green-600 text-white" : "bg-[hsl(220,13%,15%)] text-gray-400 hover:text-white"}`}
          >
            {f === "all" ? "All Trades" : outcomeLabels[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Loading journal...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📓</div>
          <div className="text-gray-400 font-semibold">No trades logged yet</div>
          <p className="text-gray-600 text-sm mt-2">Start building your trading history by logging your first trade.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">Log Your First Trade</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(trade => (
            <TradeRow
              key={trade.id}
              trade={trade}
              onClose={id => { setCloseTradeId(id); setCloseForm({ exitPrice: "", exitDate: new Date().toISOString().slice(0, 16), notes: trade.notes ?? "", strategyUsed: trade.strategyUsed ?? "" }); }}
              onDelete={id => { if (confirm("Delete this trade?")) deleteMutation.mutate(id); }}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,22%)] rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white text-lg font-black">Log a Trade</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Asset Name *</label>
                  <input value={form.assetName} onChange={e => setForm(f => ({ ...f, assetName: e.target.value }))} placeholder="e.g. RELIANCE, NIFTY 50" required className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Asset Type</label>
                  <select value={form.assetType} onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))} className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500">
                    {ASSET_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Direction</label>
                  <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as "long" | "short" }))} className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500">
                    <option value="long">📈 Long (Buy)</option>
                    <option value="short">📉 Short (Sell)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Entry Price *</label>
                  <input type="number" step="0.01" value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} placeholder="₹0.00" required className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Exit Price (optional)</label>
                  <input type="number" step="0.01" value={form.exitPrice} onChange={e => setForm(f => ({ ...f, exitPrice: e.target.value }))} placeholder="Leave blank if open" className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Quantity *</label>
                  <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Shares / lots" required className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Entry Date</label>
                  <input type="datetime-local" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))} className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Strategy Used</label>
                  <select value={form.strategyUsed} onChange={e => setForm(f => ({ ...f, strategyUsed: e.target.value }))} className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500">
                    <option value="">Select strategy...</option>
                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Notes / Reason for Trade</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Why did you enter? What was your thesis?" rows={3} className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-[hsl(220,13%,18%)] text-gray-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-[hsl(220,13%,22%)] transition-colors">Cancel</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {addMutation.isPending ? "Saving..." : "Log Trade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {closeTradeId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,22%)] rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white text-lg font-black">Close Trade</h2>
              <button onClick={() => setCloseTradeId(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleClose} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Exit Price *</label>
                <input type="number" step="0.01" value={closeForm.exitPrice} onChange={e => setCloseForm(f => ({ ...f, exitPrice: e.target.value }))} placeholder="₹0.00" required className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Exit Date</label>
                <input type="datetime-local" value={closeForm.exitDate} onChange={e => setCloseForm(f => ({ ...f, exitDate: e.target.value }))} className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Post-trade Notes</label>
                <textarea value={closeForm.notes} onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))} placeholder="What did you learn?" rows={3} className="w-full bg-[hsl(220,13%,16%)] border border-[hsl(220,13%,24%)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCloseTradeId(null)} className="flex-1 bg-[hsl(220,13%,18%)] text-gray-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-[hsl(220,13%,22%)] transition-colors">Cancel</button>
                <button type="submit" disabled={closeMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {closeMutation.isPending ? "Saving..." : "Close Trade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade, onClose, onDelete }: { trade: JournalTrade; onClose: (id: number) => void; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const pnlNum = trade.pnl ? parseFloat(trade.pnl) : null;
  const dirColor = trade.direction === "long" ? "text-green-400" : "text-red-400";

  return (
    <div className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl overflow-hidden">
      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-white font-bold truncate">{trade.assetName}</div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${outcomeColors[trade.outcome]}`}>{outcomeLabels[trade.outcome]}</span>
            <span className={`text-xs font-semibold uppercase ${dirColor}`}>{trade.direction === "long" ? "▲" : "▼"} {trade.direction}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {pnlNum !== null && (
              <span className={`font-black text-sm ${pnlNum >= 0 ? "text-green-400" : "text-red-400"}`}>
                {pnlNum >= 0 ? "+" : ""}₹{pnlNum.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            )}
            <span className="text-gray-600 text-xs">{new Date(trade.entryDate).toLocaleDateString("en-IN")}</span>
            <span className="text-gray-500 text-xs">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[hsl(220,13%,18%)] pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
            <div><div className="text-gray-500 text-xs">Asset Type</div><div className="text-white capitalize">{trade.assetType}</div></div>
            <div><div className="text-gray-500 text-xs">Entry Price</div><div className="text-white">₹{parseFloat(trade.entryPrice).toLocaleString("en-IN")}</div></div>
            <div><div className="text-gray-500 text-xs">Exit Price</div><div className="text-white">{trade.exitPrice ? `₹${parseFloat(trade.exitPrice).toLocaleString("en-IN")}` : "—"}</div></div>
            <div><div className="text-gray-500 text-xs">Quantity</div><div className="text-white">{trade.quantity}</div></div>
            <div><div className="text-gray-500 text-xs">Strategy</div><div className="text-white">{trade.strategyUsed || "—"}</div></div>
            <div><div className="text-gray-500 text-xs">Entry Date</div><div className="text-white">{new Date(trade.entryDate).toLocaleDateString("en-IN")}</div></div>
            <div><div className="text-gray-500 text-xs">Exit Date</div><div className="text-white">{trade.exitDate ? new Date(trade.exitDate).toLocaleDateString("en-IN") : "—"}</div></div>
            <div><div className="text-gray-500 text-xs">P&L</div><div className={pnlNum !== null ? (pnlNum >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold") : "text-gray-400"}>{pnlNum !== null ? `${pnlNum >= 0 ? "+" : ""}₹${pnlNum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</div></div>
          </div>
          {trade.notes && <div className="bg-[hsl(220,13%,9%)] rounded-lg p-3 text-sm text-gray-300 mb-4 italic">"{trade.notes}"</div>}
          <div className="flex gap-2">
            {trade.outcome === "open" && (
              <button onClick={() => onClose(trade.id)} className="flex-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30 font-semibold py-2 rounded-lg text-xs transition-colors">
                Close Trade & Book P&L
              </button>
            )}
            <button onClick={() => onDelete(trade.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-2 px-3 rounded-lg text-xs transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
