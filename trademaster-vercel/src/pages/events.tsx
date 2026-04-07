import { useState } from "react";

type EventCategory = "all" | "rbi" | "earnings" | "ipo" | "economic" | "expiry";

const FILTERS: { key: EventCategory; label: string; icon: string }[] = [
  { key: "all",       label: "All Events",    icon: "📅" },
  { key: "rbi",       label: "RBI / Policy",  icon: "🏦" },
  { key: "earnings",  label: "Q4 Earnings",   icon: "📊" },
  { key: "expiry",    label: "Expiry Dates",  icon: "⏰" },
  { key: "economic",  label: "Economic Data", icon: "📰" },
  { key: "ipo",       label: "IPO",           icon: "🚀" },
];

type MarketEvent = {
  date: string;           // "DD MMM"
  day: string;            // "Mon"
  title: string;
  subtitle: string;
  category: EventCategory;
  impact: "high" | "medium" | "low";
  note?: string;
};

const EVENTS: MarketEvent[] = [
  // ─── RBI / Monetary Policy ────────────────────────────────────────────────
  {
    date: "09 Apr", day: "Wed",
    title: "RBI MPC Decision",
    subtitle: "Monetary Policy Committee — Rate Announcement",
    category: "rbi", impact: "high",
    note: "Market expects 25 bps cut (Repo: 6.25% → 6.00%). Watch for RBI's inflation forecast & stance change. Major mover for Banking, NBFC, and Rate-sensitive sectors.",
  },
  {
    date: "07 Jun", day: "Sat",
    title: "RBI MPC Meeting (Next)",
    subtitle: "Second MPC review of FY 2026–27",
    category: "rbi", impact: "medium",
    note: "Follow-up to April policy. Direction depends on CPI trajectory and global central bank actions.",
  },

  // ─── Options Expiry ───────────────────────────────────────────────────────
  {
    date: "07 Apr", day: "Tue",
    title: "Nifty 50 Weekly Expiry",
    subtitle: "Apr 7, 2026 series expires today",
    category: "expiry", impact: "medium",
    note: "Max pain ~23,000. Heavy CE writing at 23,000. Expect volatility near 22,900–23,100 band until 3:30 PM.",
  },
  {
    date: "09 Apr", day: "Wed",
    title: "BankNifty Weekly Expiry",
    subtitle: "Apr 9, 2026 series expires",
    category: "expiry", impact: "medium",
    note: "Max PE OI at 52,000. Watch BN near 52,000 support — any break triggers fast moves.",
  },
  {
    date: "13 Apr", day: "Mon",
    title: "Nifty 50 Weekly Expiry",
    subtitle: "Apr 13, 2026 (holiday-adjusted from Tue Apr 14)",
    category: "expiry", impact: "medium",
    note: "Apr 14 = Dr. Ambedkar Jayanti (NSE holiday) → shifted to Monday Apr 13. Current week's active signals use this expiry.",
  },
  {
    date: "30 Apr", day: "Thu",
    title: "Nifty 50 Monthly Expiry",
    subtitle: "April series last expiry",
    category: "expiry", impact: "high",
    note: "Last Thursday of April. Max CE OI at 23,200, max PE OI at 22,000. Monthly settlement — highest gamma risk day.",
  },
  {
    date: "29 Apr", day: "Wed",
    title: "BankNifty Monthly Expiry",
    subtitle: "April series last expiry",
    category: "expiry", impact: "high",
    note: "Last Wednesday of April. Heavy OI at 51,000 PE and 53,000 CE. Settlement day = large pin risk.",
  },

  // ─── Q4 FY2026 Earnings ───────────────────────────────────────────────────
  {
    date: "11 Apr", day: "Sat",
    title: "TCS Q4 FY26 Results",
    subtitle: "Tata Consultancy Services — Quarterly Earnings",
    category: "earnings", impact: "high",
    note: "IT sector bellwether. Watch revenue growth guidance for FY27, deal wins, and margin commentary. NIFTY IT index heavily impacted.",
  },
  {
    date: "14 Apr", day: "Tue",
    title: "Infosys Q4 FY26 Results",
    subtitle: "Infosys — Quarterly Earnings (Market Holiday)",
    category: "earnings", impact: "high",
    note: "Results declared on holiday, trade impact next day Apr 15. Revenue guidance for FY27 is key — last year guidance beat sent stock +7%.",
  },
  {
    date: "19 Apr", day: "Sun",
    title: "HDFC Bank Q4 FY26 Results",
    subtitle: "HDFC Bank — Quarterly Earnings",
    category: "earnings", impact: "high",
    note: "Largest private bank. Watch NIM compression, loan growth, and CASA ratio. Direct BankNifty mover — HDFC Bank has ~30% index weight.",
  },
  {
    date: "22 Apr", day: "Wed",
    title: "Reliance Industries Q4 FY26",
    subtitle: "Reliance Industries — Quarterly Earnings",
    category: "earnings", impact: "high",
    note: "Jio subscriber growth, retail EBITDA, and O2C margins are key. At ~10% Nifty weight, Reliance results can move the index 0.5–1%.",
  },
  {
    date: "25 Apr", day: "Sat",
    title: "Wipro Q4 FY26 Results",
    subtitle: "Wipro — Quarterly Earnings",
    category: "earnings", impact: "medium",
    note: "IT mid-tier bellwether. Revenue in USD terms and guidance for Q1 FY27 sets tone for IT sector for the month.",
  },
  {
    date: "26 Apr", day: "Sun",
    title: "ICICI Bank Q4 FY26 Results",
    subtitle: "ICICI Bank — Quarterly Earnings",
    category: "earnings", impact: "high",
    note: "Second-largest private bank. Credit cost outlook and NIM guidance key. ICICI has ~8% BankNifty weight — significant sector mover.",
  },
  {
    date: "28 Apr", day: "Tue",
    title: "Maruti Suzuki Q4 FY26",
    subtitle: "Maruti Suzuki India — Quarterly Earnings",
    category: "earnings", impact: "medium",
    note: "Auto sector key — EV transition commentary and export growth are main drivers. Impacts auto-sector indices.",
  },

  // ─── Economic Data ─────────────────────────────────────────────────────────
  {
    date: "14 Apr", day: "Tue",
    title: "CPI Inflation Data (March)",
    subtitle: "India Consumer Price Index — MOSPI Release",
    category: "economic", impact: "high",
    note: "Key input for RBI's next rate decision. Market expects CPI ~4.6%. If print > 5%, rate cut expectations will be pushed out — negative for markets.",
  },
  {
    date: "15 Apr", day: "Wed",
    title: "WPI Inflation Data (March)",
    subtitle: "Wholesale Price Index — Ministry of Commerce",
    category: "economic", impact: "medium",
    note: "Upstream inflation indicator. Low WPI supports RBI's easing stance.",
  },
  {
    date: "30 Apr", day: "Thu",
    title: "GDP Growth Estimate (Q4 FY26)",
    subtitle: "Advance GDP estimate — NSO",
    category: "economic", impact: "high",
    note: "Q4 FY26 GDP estimate. Consensus ~7.0%. Upside surprise supports equity rally; downside miss hits rate-sensitive stocks.",
  },
  {
    date: "10 Apr", day: "Thu",
    title: "US CPI Inflation (March)",
    subtitle: "US Bureau of Labor Statistics — Global Impact",
    category: "economic", impact: "high",
    note: "Global risk-on/risk-off trigger. High US CPI = USD strength = FII outflows from India = Nifty pressure. Low CPI = Fed cut hopes = rally.",
  },

  // ─── IPO ──────────────────────────────────────────────────────────────────
  {
    date: "09 Apr", day: "Wed",
    title: "HDB Financial Services IPO",
    subtitle: "HDFC Bank subsidiary — NSE / BSE listing",
    category: "ipo", impact: "medium",
    note: "HDFC Bank's NBFC arm. Large-cap IPO in banking sector. Watch listing premium and post-listing impact on HDFC Bank stock price.",
  },
  {
    date: "14 Apr", day: "Tue",
    title: "Ola Electric IPO (Allotment)",
    subtitle: "Ola Electric Mobility — Allotment date",
    category: "ipo", impact: "low",
    note: "EV sector. Listing expected Apr 16. Watch for debut premium — sector sentiment indicator for EV/auto space.",
  },
];

const IMPACT_CONFIG = {
  high:   { label: "High Impact",   color: "text-red-400 bg-red-500/10 border-red-500/30" },
  medium: { label: "Medium Impact", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  low:    { label: "Low Impact",    color: "text-green-400 bg-green-500/10 border-green-500/30" },
};

const CAT_ICONS: Record<EventCategory, string> = {
  all: "📅", rbi: "🏦", earnings: "📊", expiry: "⏰", economic: "📰", ipo: "🚀",
};

const CAT_COLORS: Record<EventCategory, string> = {
  all:      "text-gray-400 bg-gray-500/10 border-gray-500/30",
  rbi:      "text-blue-400 bg-blue-500/10 border-blue-500/30",
  earnings: "text-green-400 bg-green-500/10 border-green-500/30",
  expiry:   "text-amber-400 bg-amber-500/10 border-amber-500/30",
  economic: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  ipo:      "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
};

function EventCard({ ev }: { ev: MarketEvent }) {
  const [expanded, setExpanded] = useState(false);
  const impact = IMPACT_CONFIG[ev.impact];
  const catColor = CAT_COLORS[ev.category];
  const catIcon = CAT_ICONS[ev.category];

  return (
    <div
      className="bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,20%)] rounded-xl p-4 hover:border-[hsl(220,13%,28%)] transition-all cursor-pointer"
      onClick={() => setExpanded(x => !x)}
    >
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="text-center bg-[hsl(220,13%,16%)] rounded-lg px-3 py-2 shrink-0 min-w-[56px]">
          <div className="text-white font-black text-lg leading-none">{ev.date.split(" ")[0]}</div>
          <div className="text-gray-400 text-xs font-bold mt-0.5">{ev.date.split(" ")[1]}</div>
          <div className="text-gray-600 text-[10px] mt-0.5">{ev.day}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="text-white font-bold text-sm">{ev.title}</div>
              <div className="text-gray-500 text-xs mt-0.5">{ev.subtitle}</div>
            </div>
            <div className="flex gap-1.5 flex-wrap shrink-0">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${catColor}`}>
                {catIcon} {ev.category === "rbi" ? "RBI" : ev.category.charAt(0).toUpperCase() + ev.category.slice(1)}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${impact.color}`}>
                {impact.label}
              </span>
            </div>
          </div>

          {ev.note && (
            <>
              <div className={`text-xs text-gray-400 mt-2 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
                {ev.note}
              </div>
              <button className="text-[10px] text-gray-600 hover:text-gray-400 mt-1 transition-colors">
                {expanded ? "Show less ▲" : "Read more ▼"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Events() {
  const [filter, setFilter] = useState<EventCategory>("all");

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).replace("-", " ");

  const visible = EVENTS.filter(e => filter === "all" || e.category === filter);

  const upcoming = visible.filter(e => {
    const parts = e.date.split(" ");
    const d = parseInt(parts[0], 10);
    const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const evDate = new Date(today.getFullYear(), months[parts[1]] ?? 0, d);
    return evDate >= today;
  });

  const past = visible.filter(e => {
    const parts = e.date.split(" ");
    const d = parseInt(parts[0], 10);
    const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const evDate = new Date(today.getFullYear(), months[parts[1]] ?? 0, d);
    return evDate < today;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Market Events</h1>
        <p className="text-gray-500 text-sm mt-0.5">Earnings, RBI policy, option expiries & economic data — April 2026</p>
      </div>

      {/* High-impact highlight */}
      <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Next High Impact Event</span>
        </div>
        <div className="text-white font-bold">🏦 RBI MPC Rate Decision — Wed, 09 Apr 2026</div>
        <div className="text-gray-400 text-sm mt-1">
          Market expects a <span className="text-green-400 font-semibold">25 bps rate cut</span>. If confirmed, Banking and NBFC stocks rally sharply. Watch BankNifty at 52,000 support for directional confirmation.
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 border ${
              filter === f.key
                ? "bg-green-600/20 text-green-400 border-green-600/30"
                : "text-gray-500 hover:text-gray-300 border-transparent"
            }`}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
            {f.key !== "all" && (
              <span className="text-[10px] bg-[hsl(220,13%,20%)] text-gray-500 rounded px-1">
                {EVENTS.filter(e => e.category === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Upcoming</span>
            <span className="text-gray-600 text-xs">({upcoming.length})</span>
          </div>
          <div className="space-y-3">
            {upcoming.map((ev, i) => <EventCard key={i} ev={ev} />)}
          </div>
        </div>
      )}

      {/* Past Events */}
      {past.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
            <span className="text-gray-600 text-xs font-bold uppercase tracking-wider">Past</span>
          </div>
          <div className="space-y-3 opacity-60">
            {past.map((ev, i) => <EventCard key={i} ev={ev} />)}
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold">No events in this category</div>
        </div>
      )}

      <p className="text-center text-gray-700 text-xs mt-8">
        ⚠️ Event dates are indicative and may change. Not investment advice. Educational use only.
      </p>
    </div>
  );
}
