import { useState, useEffect } from "react";
import { persistConsent, checkConsent } from "@/lib/api";

const CONSENT_KEY = "trademaster_legal_consent";
const SESSION_KEY = "trademaster_session_id";

function hasLocalConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

function getOrCreateSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `tm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `tm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function saveConsentLocally(): void {
  try {
    localStorage.setItem(CONSENT_KEY, "accepted");
  } catch {
    // ignore storage errors
  }
}

export function DisclaimerModal() {
  const [open, setOpen] = useState<boolean>(() => !hasLocalConsent());
  const [checked, setChecked] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sid = getOrCreateSessionId();
    checkConsent(sid).then((result) => {
      if (result.hasConsented) {
        saveConsentLocally();
        setOpen(false);
      }
    }).catch(() => {});
  }, [open]);

  const handleProceed = async () => {
    if (!checked || proceeding) return;
    setProceeding(true);
    saveConsentLocally();
    try {
      const sessionId = getOrCreateSessionId();
      await persistConsent(sessionId);
    } catch {
      // API persistence is best-effort; localStorage is the primary gate
    }
    setOpen(false);
    setProceeding(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-[hsl(220,13%,11%)] border border-yellow-500/40 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-[hsl(220,13%,18%)] shrink-0">
          <div className="w-10 h-10 bg-yellow-500/15 border border-yellow-500/30 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-yellow-400 text-lg">⚠️</span>
          </div>
          <div>
            <h2 className="text-yellow-400 text-lg font-black">Legal Agreement & SEBI Disclaimer</h2>
            <p className="text-gray-500 text-xs mt-0.5">You must read and agree before accessing TradeMaster Pro</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 text-sm text-gray-300 leading-relaxed flex-1">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-300 font-bold text-sm mb-1">⚠️ NOT a SEBI-Registered Investment Advisor</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              TradeMaster Pro is <strong className="text-white">not registered with SEBI</strong> as an investment adviser, research analyst, or stock broker under the Securities and Exchange Board of India (Investment Advisers) Regulations, 2013. We do not provide personalised investment advice, portfolio management, or financial planning services.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">1. Educational Purpose Only</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              All trading signals, technical analysis levels, investment reports, market commentary, and any other content published on TradeMaster Pro are strictly for <strong className="text-yellow-400">educational and informational purposes only</strong>. They are intended to help users learn about market analysis techniques and are not meant to be relied upon as investment, trading, or financial advice.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">2. No Investment Recommendations</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Nothing on this platform constitutes a recommendation, solicitation, or offer to buy, sell, or hold any security, derivative, commodity, currency, or any other financial instrument. Users should not construe any information on this platform as investment advice tailored to their individual financial situation.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">3. Substantial Risk of Loss</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Trading in equity markets, futures and options (F&O), commodities, and currencies involves <strong className="text-red-400">substantial risk of capital loss</strong>. Leveraged instruments such as options and futures can result in losses exceeding your initial investment. You should only trade with capital you can afford to lose entirely.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">4. Past Performance Disclaimer</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Past performance of any signal, strategy, or analysis shown on this platform is <strong className="text-white">not indicative of future results</strong>. Historical success rates and accuracy metrics are presented for educational reference only and provide no guarantee of similar performance going forward.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">5. Data Delay Notice</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Market data, prices, and signals displayed on this platform may be <strong className="text-white">delayed by 15–30 minutes</strong>. This data is provided for educational reference and should not be used as the basis for real-time trading decisions.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">6. Subscription Fee Clarification</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              The subscription fee is charged for access to <strong className="text-white">software tools, educational content, charting tools, screening logic, and historical data analysis features</strong> only. It is expressly <strong className="text-red-300">not</strong> a fee for financial advisory, investment management, or SEBI-regulated services of any kind.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">7. Consult a Qualified Advisor</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Before making any investment or trading decision, please consult a SEBI-registered investment adviser or a qualified financial professional who can provide advice suited to your specific financial situation, risk tolerance, and investment objectives.
            </p>
          </div>

          <div>
            <p className="font-bold text-white mb-1">8. Jurisdiction</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              This platform is intended for users within India and is governed by Indian law. It is your responsibility to ensure compliance with the laws and regulations applicable in your jurisdiction before using this platform.
            </p>
          </div>
        </div>

        {/* Footer: checkbox + button */}
        <div className="px-6 pb-6 pt-4 border-t border-[hsl(220,13%,18%)] shrink-0 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  checked
                    ? "bg-green-600 border-green-500"
                    : "border-gray-500 bg-[hsl(220,13%,14%)] group-hover:border-gray-400"
                }`}
              >
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-snug">
              I have read, understood, and agree to the above disclaimer. I acknowledge that TradeMaster Pro is an educational tool and <strong className="text-white">not a SEBI-registered investment adviser</strong>. I will not rely on its content as financial advice and accept full responsibility for my own trading and investment decisions.
            </p>
          </label>

          <button
            onClick={handleProceed}
            disabled={!checked || proceeding}
            className={`w-full font-black py-3.5 px-6 rounded-xl transition-all text-base ${
              checked && !proceeding
                ? "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-lg shadow-green-900/30 cursor-pointer"
                : "bg-[hsl(220,13%,18%)] text-gray-600 cursor-not-allowed"
            }`}
          >
            {proceeding ? "Saving…" : checked ? "I Agree — Proceed to TradeMaster Pro →" : "Tick the checkbox above to proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}
